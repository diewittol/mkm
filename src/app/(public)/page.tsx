import { Hero } from "@/components/home/Hero";
import { Advantages } from "@/components/home/Advantages";
import { Categories } from "@/components/home/Categories";
import { Process } from "@/components/home/Process";
import { PopularProducts } from "@/components/home/PopularProducts";
import { Projects } from "@/components/home/Projects";
import { ContactsCTA } from "@/components/home/ContactsCTA";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
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