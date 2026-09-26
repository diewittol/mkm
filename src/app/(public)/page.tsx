import { Hero } from "@/components/home/Hero";
import { Advantages } from "@/components/home/Advantages";
import { Categories } from "@/components/home/Categories";
import { Process } from "@/components/home/Process";
import { PopularProducts } from "@/components/home/PopularProducts";
import { Projects } from "@/components/home/Projects";
import { ContactsCTA } from "@/components/home/ContactsCTA";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata, getBusinessLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return buildMetadata({
    title: "Мебель на заказ в Адыгее — кухни, спальни, лестницы | МКМ",
    description:
      "МКМ — мебель на заказ в Адыгее: кухни, спальни, детская, прихожие, лестницы. Точный раскрой на станках с ЧПУ, гарантия 5 лет. Ст. Ханская, рядом с Майкопом.",
    path: "/",
  });
}

export default async function HomePage() {
  const businessLd = await getBusinessLd();

  return (
    <>
      <JsonLd data={businessLd} />
      <Hero />
      <Advantages />
      <Categories />
      <Process />
      <PopularProducts />
      <Projects />
      <ContactsCTA />
    </>
  );
}