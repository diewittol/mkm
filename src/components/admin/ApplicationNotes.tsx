"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { groupNotes } from "@/lib/note-groups";

interface NoteFromApi {
  id: string;
  author: string;
  text: string | null;
  photo: string | null;
  audio: string | null;
  audioSeconds: number | null;
  batchId: string | null;
  createdAt: string;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

// Лента заметок и фото заявки: размеры, пожелания, замеры, эскизы
export const ApplicationNotes = ({
  applicationId,
  onCountChange,
}: {
  applicationId: string;
  onCountChange?: (count: number) => void;
}) => {
  const [notes, setNotes] = useState<NoteFromApi[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [progress, setProgress] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const base = `/api/applications/${applicationId}/notes`;

  useEffect(() => {
    fetch(base)
      .then((r) => r.json())
      .then((data: NoteFromApi[]) => setNotes(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [base]);

  const updateNotes = (next: NoteFromApi[]) => {
    setNotes(next);
    onCountChange?.(next.length);
  };

  const send = async (payload: { text?: string; file?: File; batch: string }) => {
    const form = new FormData();
    form.append("batch", payload.batch);
    if (payload.text) form.append("text", payload.text);
    if (payload.file) {
      // Аудио и фото идут в разные поля, сервер проверяет содержимое
      const isAudio =
        payload.file.type.startsWith("audio/") ||
        /\.(ogg|oga|opus|mp3|m4a)$/i.test(payload.file.name);
      form.append(isAudio ? "audio" : "photo", payload.file);
    }

    const response = await fetch(base, { method: "POST", body: form });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error ?? "Не удалось сохранить");
    }
    return (await response.json()) as NoteFromApi;
  };

  const handleAdd = async () => {
    const files = Array.from(fileInput.current?.files ?? []);
    const trimmed = text.trim();
    if (!trimmed && files.length === 0) return;

    // Всё, что добавлено за одно нажатие, склеивается в одну заметку
    const batch = crypto.randomUUID().replace(/-/g, "");
    const added: NoteFromApi[] = [];
    try {
      if (files.length === 0) {
        setProgress("Сохраняем…");
        added.push(await send({ text: trimmed, batch }));
      } else {
        // Фото по одному (у сервера лимит на размер запроса); текст — к первому
        for (let i = 0; i < files.length; i++) {
          setProgress(`Загружаем файл ${i + 1} из ${files.length}…`);
          added.push(await send({ file: files[i], text: i === 0 ? trimmed : undefined, batch }));
        }
      }
      setText("");
      if (fileInput.current) fileInput.current.value = "";
    } catch (error) {
      alert(error instanceof Error ? error.message : "Не удалось сохранить");
    } finally {
      setProgress(null);
      if (added.length) updateNotes([...notes, ...added]);
    }
  };

  const handleDelete = async (group: NoteFromApi[]) => {
    if (!confirm("Удалить эту заметку целиком (текст, фото и голосовые)?")) return;

    const deleted = new Set<string>();
    for (const note of group) {
      const response = await fetch(`${base}/${note.id}`, { method: "DELETE" });
      if (response.ok) deleted.add(note.id);
    }
    if (deleted.size < group.length) alert("Не всё удалось удалить");
    if (deleted.size) updateNotes(notes.filter((n) => !deleted.has(n.id)));
  };

  return (
    <div className="border-t border-border pt-5">
      <p className="text-xs font-medium uppercase tracking-wider text-text/50">
        Заметки и фото
      </p>

      <div className="mt-3 space-y-3">
        {isLoading ? (
          <p className="text-sm text-text/50">Загрузка…</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-text/50">
            Пока пусто. Добавьте размеры, пожелания клиента, фото замеров.
          </p>
        ) : (
          groupNotes(notes).map((group) => {
            const first = group.notes[0];
            const photos = group.notes.filter((n) => n.photo);
            return (
              <div key={group.key} className="rounded-xl border border-border bg-background/50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-text/50">
                    {formatDate(first.createdAt)} · {first.author}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDelete(group.notes)}
                    aria-label="Удалить заметку"
                    className="flex h-6 w-6 flex-none items-center justify-center rounded text-text/40 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {group.notes
                  .filter((n) => n.text)
                  .map((n) => (
                    <p key={n.id} className="mt-1.5 whitespace-pre-wrap text-sm text-text">
                      {n.text}
                    </p>
                  ))}

                {group.notes
                  .filter((n) => n.audio)
                  .map((n) => (
                    <div key={n.id} className="mt-2">
                      <audio
                        controls
                        preload="none"
                        src={`${base}/${n.id}/audio`}
                        className="w-full max-w-xs"
                      />
                      <p className="mt-1 text-xs text-text/40">
                        Голосовое
                        {n.audioSeconds
                          ? `, ${Math.floor(n.audioSeconds / 60)}:${String(n.audioSeconds % 60).padStart(2, "0")}`
                          : ""}
                        {" · "}
                        <a
                          href={`${base}/${n.id}/audio`}
                          download
                          className="underline hover:text-primary"
                        >
                          скачать
                        </a>
                      </p>
                    </div>
                  ))}

                {photos.length > 0 && (
                  <div className="mt-2 grid max-w-xs grid-cols-2 gap-2">
                    {photos.map((n) => (
                      <a
                        key={n.id}
                        href={`${base}/${n.id}/photo`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`relative block aspect-[4/3] overflow-hidden rounded-lg bg-beige ${photos.length === 1 ? "col-span-2" : ""}`}
                      >
                        <Image
                          src={`${base}/${n.id}/photo`}
                          alt="Фото заказа"
                          fill
                          sizes="320px"
                          className="object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Размеры, пожелания, материал, цвет… Можно прикрепить фото и голосовые."
          className="w-full resize-none rounded-lg border border-border bg-white px-4 py-3 text-sm text-text outline-none transition placeholder:text-text/40 focus:border-primary"
        />
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,audio/ogg,audio/mpeg,audio/mp4,audio/x-m4a,.ogg,.oga,.opus,.mp3,.m4a"
          multiple
          className="block w-full text-sm text-text/70 file:mr-3 file:rounded-lg file:border-0 file:bg-beige file:px-4 file:py-2 file:text-sm file:font-medium file:text-text"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={progress !== null}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {progress ?? "Добавить в ленту"}
        </button>
      </div>
    </div>
  );
};
