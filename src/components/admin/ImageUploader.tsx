"use client";

import { useRef, useState, type DragEvent } from "react";
import Image from "next/image";
import { Plus, X, Loader2 } from "lucide-react";

interface UploadedImage {
  id: string;
  url: string;
}

interface ImageUploaderProps {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
}

export const ImageUploader = ({ images, onChange }: ImageUploaderProps) => {
  const [isDragging, setDragging] = useState(false);
  const [isUploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setUploading(true);

    const newImages: UploadedImage[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          alert(error.error ?? `Не удалось загрузить ${file.name}`);
          continue;
        }

        const data = await response.json();
        newImages.push({
          id: crypto.randomUUID(),
          url: data.url,
        });
      } catch {
        alert(`Ошибка сети при загрузке ${file.name}`);
      }
    }

    if (newImages.length > 0) {
      onChange([...images, ...newImages]);
    }

    setUploading(false);
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);

    const files = Array.from(e.dataTransfer.files);
    void uploadFiles(files);
  };

  const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    void uploadFiles(files);
    e.target.value = "";
  };

  const removeImage = (id: string) => {
    onChange(images.filter((img) => img.id !== id));
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div>
      {/* Зона загрузки */}
      <label
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
          isDragging
            ? "border-primary bg-beige"
            : "border-border bg-background/50 hover:border-primary hover:bg-background"
        } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="hidden"
          onChange={handleInputChange}
        />

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-beige text-primary">
          {isUploading ? (
            <Loader2 size={22} className="animate-spin" />
          ) : (
            <Plus size={22} />
          )}
        </div>

        <p className="mt-4 font-medium text-text">
          {isUploading ? "Загружаем…" : "Перетащите фотографии"}
        </p>
        <p className="mt-1 text-sm text-text/60">или</p>
        <span className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark">
          Выбрать файлы
        </span>
        <p className="mt-4 text-xs text-text/50">
          JPG, PNG, WEBP, AVIF — до 10 МБ
        </p>
      </label>

      {/* Превью загруженных */}
      {images.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, index) => (
            <div
              key={img.id}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-beige"
            >
              <Image
                src={img.url}
                alt={`Фото ${index + 1}`}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover"
              />

              {index === 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
                  Главная
                </span>
              )}

              {/* Удалить */}
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                aria-label="Удалить фото"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-text/70 transition hover:bg-white hover:text-red-600"
              >
                <X size={14} />
              </button>

              {/* Стрелки порядка */}
              <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => moveImage(index, index - 1)}
                  disabled={index === 0}
                  aria-label="Влево"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-text/70 transition hover:bg-white hover:text-primary disabled:opacity-30"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => moveImage(index, index + 1)}
                  disabled={index === images.length - 1}
                  aria-label="Вправо"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-text/70 transition hover:bg-white hover:text-primary disabled:opacity-30"
                >
                  →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};