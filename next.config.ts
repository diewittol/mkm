import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Все изображения на сайте — загруженный пользователем контент
    // (public/uploads), добавляемый после сборки. Встроенный оптимизатор
    // Next.js/Turbopack не видит такие файлы в production (next start) —
    // отдаём их как есть, напрямую через nginx.
    unoptimized: true,
  },
};

export default nextConfig;
