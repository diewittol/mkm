import { prisma } from "@/lib/prisma";
import { deleteOrderFile, saveOrderAudio, saveOrderPhoto } from "@/lib/order-files";

export const MAX_NOTE_TEXT = 2000;

interface NewNote {
  applicationId: string;
  // @username / имя из Telegram / «админка»
  author: string;
  text?: string | null;
  // Исходные байты фото (сжатие и проверка — внутри)
  photo?: Buffer | null;
  // Голосовое / аудио (сохраняется как есть) и его длительность, если известна
  audio?: Buffer | null;
  audioSeconds?: number | null;
}

// Запись в ленту заявки: текст, фото или и то и другое.
// Общая для бота и админки. Бросает ошибку, если фото — не картинка.
export async function addApplicationNote(input: NewNote) {
  const text = input.text?.trim().slice(0, MAX_NOTE_TEXT) || null;
  if (!text && !input.photo && !input.audio) throw new Error("Пустая заметка");

  const photo = input.photo ? await saveOrderPhoto(input.photo) : null;
  const audio = input.audio ? await saveOrderAudio(input.audio) : null;

  try {
    return await prisma.applicationNote.create({
      data: {
        applicationId: input.applicationId,
        author: input.author,
        text,
        photo,
        audio,
        audioSeconds: audio ? (input.audioSeconds ?? null) : null,
      },
    });
  } catch (error) {
    // Заявку могли удалить, пока грузилось фото — не оставляем файл-сироту
    if (photo) await deleteOrderFile(photo);
    if (audio) await deleteOrderFile(audio);
    throw error;
  }
}

export async function deleteApplicationNote(applicationId: string, noteId: string) {
  const note = await prisma.applicationNote.findFirst({
    where: { id: noteId, applicationId },
  });
  if (!note) return false;

  await prisma.applicationNote.delete({ where: { id: note.id } });
  if (note.photo) await deleteOrderFile(note.photo);
  if (note.audio) await deleteOrderFile(note.audio);
  return true;
}

// Удаление заявки вместе с файлами её заметок (записи в БД удаляются каскадом,
// а файлы на диске — нет)
export async function deleteApplicationWithFiles(applicationId: string) {
  const notes = await prisma.applicationNote.findMany({
    where: { applicationId },
    select: { photo: true, audio: true },
  });

  await prisma.application.deleteMany({ where: { id: applicationId } });
  await Promise.all(
    notes.flatMap((n) => [n.photo, n.audio]).map((f) => (f ? deleteOrderFile(f) : null)),
  );
}
