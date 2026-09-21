import { prisma } from "@/lib/prisma";
import { deleteOrderPhoto, saveOrderPhoto } from "@/lib/order-files";

export const MAX_NOTE_TEXT = 2000;

interface NewNote {
  applicationId: string;
  // @username / имя из Telegram / «админка»
  author: string;
  text?: string | null;
  // Исходные байты фото (сжатие и проверка — внутри)
  photo?: Buffer | null;
}

// Запись в ленту заявки: текст, фото или и то и другое.
// Общая для бота и админки. Бросает ошибку, если фото — не картинка.
export async function addApplicationNote(input: NewNote) {
  const text = input.text?.trim().slice(0, MAX_NOTE_TEXT) || null;
  if (!text && !input.photo) throw new Error("Пустая заметка");

  const photo = input.photo ? await saveOrderPhoto(input.photo) : null;

  try {
    return await prisma.applicationNote.create({
      data: {
        applicationId: input.applicationId,
        author: input.author,
        text,
        photo,
      },
    });
  } catch (error) {
    // Заявку могли удалить, пока грузилось фото — не оставляем файл-сироту
    if (photo) await deleteOrderPhoto(photo);
    throw error;
  }
}

export async function deleteApplicationNote(applicationId: string, noteId: string) {
  const note = await prisma.applicationNote.findFirst({
    where: { id: noteId, applicationId },
  });
  if (!note) return false;

  await prisma.applicationNote.delete({ where: { id: note.id } });
  if (note.photo) await deleteOrderPhoto(note.photo);
  return true;
}

// Удаление заявки вместе с файлами её заметок (записи в БД удаляются каскадом,
// а файлы на диске — нет)
export async function deleteApplicationWithFiles(applicationId: string) {
  const notes = await prisma.applicationNote.findMany({
    where: { applicationId, photo: { not: null } },
    select: { photo: true },
  });

  await prisma.application.deleteMany({ where: { id: applicationId } });
  await Promise.all(notes.map((n) => (n.photo ? deleteOrderPhoto(n.photo) : null)));
}
