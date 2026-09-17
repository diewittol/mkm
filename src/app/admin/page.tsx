import Link from "next/link";
import { Package, Folder, Mail, Briefcase, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // Считаем статистику одним махом
    const [productsCount, categoriesCount, newApplicationsCount, projectsCount] =
    await Promise.all([
      prisma.product.count(),
      prisma.category.count(),
      prisma.application.count({ where: { status: "new" } }),
      prisma.project.count(),
    ]);

  const recentProducts = await prisma.product.findMany({
    include: {
      category: true,
      images: { orderBy: { order: "asc" } },
      specifications: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const stats = [
    {
      label: "Изделия",
      value: productsCount,
      hint: "Всего изделий",
      icon: Package,
    },
    {
      label: "Категории",
      value: categoriesCount,
      hint: "Все категории",
      icon: Folder,
    },
    {
      label: "Заявки",
      value: newApplicationsCount,
      hint: "Новые заявки",
      icon: Mail,
    },
    {
      label: "Проекты",
      value: projectsCount,
      hint: "Все проекты",
      icon: Briefcase,
    },
  ];

  return (
    <div>
      {/* Заголовок */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-montserrat text-2xl font-bold text-text md:text-3xl">
            Панель управления
          </h1>
          <p className="mt-1 text-sm text-text/60">
            Добро пожаловать, Администратор
          </p>
        </div>

        <Link
          href="/admin/products/create"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-dark"
        >
          <Plus size={16} />
          Добавить изделие
        </Link>
      </div>

      {/* Карточки статистики */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-border bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-text/60">
                  {stat.label}
                </p>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-beige text-primary">
                  <Icon size={18} strokeWidth={1.75} />
                </div>
              </div>
              <p className="mt-3 font-montserrat text-3xl font-bold text-text">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-text/50">{stat.hint}</p>
            </div>
          );
        })}
      </div>

      {/* Последние изделия */}
      <div className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="font-montserrat text-lg font-semibold text-text">
            Последние изделия
          </h2>
          <Link
            href="/admin/products"
            className="text-sm font-medium text-primary transition hover:text-primary-dark"
          >
            Все изделия
          </Link>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-background/50">
                <tr className="text-left text-xs font-medium uppercase tracking-wider text-text/50">
                  <th className="px-5 py-3">Название</th>
                  <th className="px-5 py-3">Категория</th>
                  <th className="px-5 py-3">Статус</th>
                  <th className="px-5 py-3">Дата</th>
                </tr>
              </thead>
              <tbody>
                {recentProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-16 text-center text-sm text-text/60"
                    >
                      Пока нет изделий. Добавьте первое.
                    </td>
                  </tr>
                ) : (
                  recentProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-border last:border-0 hover:bg-background/50"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="font-medium text-text transition hover:text-primary"
                        >
                          {product.name}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-sm text-text/70">
                        {product.category.name}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                            product.isPublished
                              ? "bg-green-50 text-green-700"
                              : "bg-yellow-50 text-yellow-700"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              product.isPublished
                                ? "bg-green-500"
                                : "bg-yellow-500"
                            }`}
                          />
                          {product.isPublished ? "Опубликовано" : "Черновик"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-text/60">
                        {new Date(product.createdAt).toLocaleDateString("ru-RU")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}