import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

// Пароль админки: хэш в БД (его меняет владелец через бота), запасной вариант —
// ADMIN_PASSWORD из .env, пока пароль в БД не задан. Только Node (не для middleware).

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 100;

const SCRYPT_KEYLEN = 32;

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function verifyHash(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

function equalStrings(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const credential = await prisma.adminCredential.findUnique({ where: { id: "singleton" } });
  if (credential) return verifyHash(password, credential.passwordHash);

  const fromEnv = process.env.ADMIN_PASSWORD ?? "";
  return fromEnv.length > 0 && equalStrings(password, fromEnv);
}

export async function setAdminPassword(password: string, changedBy: string) {
  const passwordHash = hashPassword(password);
  await prisma.adminCredential.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", passwordHash, changedBy },
    update: { passwordHash, changedBy },
  });
}

export const isValidNewPassword = (password: string) =>
  password.length >= MIN_PASSWORD_LENGTH && password.length <= MAX_PASSWORD_LENGTH;

// Без похожих символов (0/O, 1/l/I): 32 знака, 16 символов = 80 бит
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePassword(length = 16): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}
