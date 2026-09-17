import Link from "next/link";

interface CategoryFilterProps {
  categories: { slug: string; name: string }[];
  currentCategory: string;
}

export const CategoryFilter = ({
  categories,
  currentCategory,
}: CategoryFilterProps) => {
  const items = [{ slug: "", name: "Все" }, ...categories];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((category) => {
        const isActive = currentCategory === category.slug;
        const href = category.slug
          ? `/catalog?category=${category.slug}`
          : "/catalog";

        return (
          <Link
            key={category.slug || "all"}
            href={href}
            className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
              isActive
                ? "bg-primary text-white"
                : "border border-border bg-white text-text hover:border-primary hover:text-primary"
            }`}
          >
            {category.name}
          </Link>
        );
      })}
    </div>
  );
};
