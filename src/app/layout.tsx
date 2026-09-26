import type { Metadata } from "next";
import { Montserrat, Inter } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  // Относительные адреса в canonical и Open Graph превращаются в абсолютные
  metadataBase: new URL(SITE_URL),
  title: "Мебель на заказ в Адыгее — МКМ",
  description: "Изготовление мебели по индивидуальным размерам для дома и бизнеса",
  openGraph: { type: "website", locale: "ru_RU", siteName: SITE_NAME },
  // Подтверждение прав на сайт в Яндекс.Вебмастере
  verification: { yandex: "f1569dd844afe815" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${montserrat.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}