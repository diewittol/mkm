import { permanentRedirect } from "next/navigation";
import { CatalogListing } from "@/components/catalog/CatalogListing";
import { buildMetadata, categoryPath } from "@/lib/seo";

export const dynamic = "force-dynamic";

interface CatalogPageProps {
  searchParams: Promise<{ category?: string }>;
}

export async function generateMetadata() {
  return buildMetadata({
    title: "Каталог мебели на заказ в Адыгее — МКМ",
    description:
      "Каталог МКМ: кухни, спальни, детская мебель, столы и стулья, лестницы, прихожие и гостиные на заказ по вашим размерам. Ст. Ханская, Адыгея.",
    path: "/catalog",
  });
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const { category } = await searchParams;

  // Старые ссылки вида /catalog?category=kitchen ведут на отдельную страницу категории
  if (category) permanentRedirect(categoryPath(category));

  return <CatalogListing />;
}
