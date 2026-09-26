import { notFound } from "next/navigation";
import { CatalogListing } from "@/components/catalog/CatalogListing";
import { prisma } from "@/lib/prisma";
import { buildMetadata, categoryPath, truncate } from "@/lib/seo";

export const dynamic = "force-dynamic";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) return { title: "Категория не найдена — МКМ" };

  return buildMetadata({
    title: `${category.name} на заказ в Адыгее — МКМ`,
    description: truncate(
      category.description ??
        `${category.name} на заказ по индивидуальным размерам. Изготовление на станках с ЧПУ, гарантия 5 лет. МКМ, ст. Ханская, Адыгея.`,
    ),
    path: categoryPath(category.slug),
    image: category.image ?? undefined,
  });
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug }, select: { slug: true } });
  if (!category) notFound();

  return <CatalogListing categorySlug={category.slug} />;
}
