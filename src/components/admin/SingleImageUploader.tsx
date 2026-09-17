"use client";

import { useRef, useState, type DragEvent } from "react";
import Image from "next/image";
import { Plus, X, Loader2 } from "lucide-react";

interface SingleImageUploaderProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
}

export const SingleImageUploader = ({
  value,
  onChange,
}: SingleImageUploaderProps) => {
  const [isDragging, setDragging] = useState(false);
  const [isUploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        alert(error.error ?? "Не удалось загрузить");
        return;
      }

      const data = await response.json();
      onChange(data.url);
    } catch {
      alert("Ошибка сети при загрузке");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void uploadFile(file);
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
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
    e.target.value = "";
  };

  // Уже есть картинка — показываем её
  if (value) {
    return (
      <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-beige">
        <Image
          src={value}
          alt="Превью"
          fill
          sizes="(min-width: 1024px) 320px, 100vw"
          className="object-cover"
        />
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Удалить"
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-text/70 transition hover:bg-white hover:text-red-600"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  // Нет картинки — зона загрузки
  return (
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
        {isUploading ? "Загружаем…" : "Перетащите фото"}
      </p>
      <p className="mt-1 text-sm text-text/60">или</p>
      <span className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">
        Выбрать файл
      </span>
      <p className="mt-4 text-xs text-text/50">
        JPG, PNG, WEBP — до 10 МБ
      </p>
    </label>
  );
};