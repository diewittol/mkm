import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Чистим на случай повторного запуска
  await prisma.project.deleteMany();
  await prisma.application.deleteMany();
  await prisma.productSpecification.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.settings.deleteMany();

  // Категории
  const categories = await Promise.all([
    prisma.category.create({
      data: { name: "Кровати", slug: "beds", order: 1 },
    }),
    prisma.category.create({
      data: { name: "Кухни", slug: "kitchens", order: 2 },
    }),
    prisma.category.create({
      data: { name: "Шкафы", slug: "wardrobes", order: 3 },
    }),
    prisma.category.create({
      data: { name: "Столы и стулья", slug: "tables", order: 4 },
    }),
    prisma.category.create({
      data: { name: "Мягкая мебель", slug: "sofas", order: 5 },
    }),
    prisma.category.create({
      data: { name: "Комоды и тумбы", slug: "chests", order: 6 },
    }),
    prisma.category.create({
      data: { name: "Стеллажи", slug: "shelves", order: 7 },
    }),
    prisma.category.create({
      data: { name: "Аксессуары", slug: "accessories", order: 8 },
    }),
  ]);

  const [beds, kitchens, wardrobes, tables] = categories;

  // Изделия
  const product1 = await prisma.product.create({
    data: {
      name: "Кровать «Ривьера»",
      slug: "krovat-riviera",
      categoryId: beds.id,
      shortDescription: "Массив дуба",
      description:
        "Двуспальная кровать из массива дуба с мягким изголовьем. Изготовим по вашим размерам.",
      isPublished: true,
      images: {
        create: [{ url: "/placeholder.jpg", alt: "Кровать Ривьера", order: 0 }],
      },
      specifications: {
        create: [
          { name: "Материал", value: "Массив дуба" },
          { name: "Размер", value: "180 × 200 см" },
        ],
      },
    },
  });

  await prisma.product.create({
    data: {
      name: "Кухня «Лофт»",
      slug: "kuhnya-loft",
      categoryId: kitchens.id,
      shortDescription: "Массив ясеня",
      isPublished: true,
      images: {
        create: [{ url: "/placeholder.jpg", alt: "Кухня Лофт", order: 0 }],
      },
      specifications: {
        create: [
          { name: "Фасады", value: "МДФ эмаль" },
          { name: "Столешница", value: "Кварцевый агломерат" },
        ],
      },
    },
  });

  await prisma.product.create({
    data: {
      name: "Стол обеденный «Сканди»",
      slug: "stol-skandi",
      categoryId: tables.id,
      shortDescription: "Массив дуба",
      isPublished: true,
      images: {
        create: [{ url: "/placeholder.jpg", alt: "Стол Сканди", order: 0 }],
      },
      specifications: {
        create: [
          { name: "Материал", value: "Массив дуба" },
          { name: "Размер", value: "200 × 100 см" },
        ],
      },
    },
  });

  const product4 = await prisma.product.create({
    data: {
      name: "Шкаф распашной",
      slug: "shkaf-raspashnoy",
      categoryId: wardrobes.id,
      shortDescription: "Массив дуба",
      isPublished: true,
      images: {
        create: [{ url: "/placeholder.jpg", alt: "Шкаф распашной", order: 0 }],
      },
      specifications: {
        create: [
          { name: "Материал", value: "Массив дуба" },
          { name: "Высота", value: "240 см" },
        ],
      },
    },
  });

  // Заявки
  await prisma.application.createMany({
    data: [
      {
        name: "Иван Петров",
        phone: "+7 (999) 123-45-67",
        message: "Интересует изделие: Кровать «Ривьера»",
        productId: product1.id,
        status: "new",
      },
      {
        name: "Мария Смирнова",
        phone: "+7 (912) 345-67-89",
        message:
          "Нужна кухня под нестандартные размеры. Высота потолков 3.2 м.",
        status: "in_progress",
      },
      {
        name: "Алексей Кузнецов",
        phone: "+7 (903) 111-22-33",
        message: "Интересует изделие: Шкаф распашной",
        productId: product4.id,
        status: "new",
      },
      {
        name: "Ольга Иванова",
        phone: "+7 (925) 777-88-99",
        message: "Сколько будет стоить стол из дуба 120×80 см?",
        status: "done",
      },
      {
        name: "Дмитрий Соколов",
        phone: "+7 (916) 555-44-33",
        message: "Спам-заявка",
        status: "rejected",
      },
    ],
  });

  // Настройки (singleton)
    // Проекты
  await prisma.project.createMany({
    data: [
      {
        title: "Спальня в скандинавском стиле",
        slug: "spalnya-skandi",
        location: "Красноярск",
        description:
          "Комплект мебели для спальни из массива дуба: кровать, комод, тумбы.",
        isPublished: true,
        order: 1,
      },
      {
        title: "Кухня с островом",
        slug: "kuhnya-s-ostrovom",
        location: "Академгородок",
        description:
          "Кухня из массива ясеня с островом и встроенной техникой.",
        isPublished: true,
        order: 2,
      },
      {
        title: "Обеденная зона в загородном доме",
        slug: "obedennaya-zona",
        location: "Дивногорск",
        description:
          "Обеденный стол и стулья из массива дуба на 8 персон.",
        isPublished: true,
        order: 3,
      },
    ],
  });

  await prisma.settings.create({
    data: {
      id: "singleton",
      companyName: "МКМ — мебель из массива дерева",
      phone: "+7 (999) 123-45-67",
      email: "info@mkm.ru",
      address: "г. Красноярск, ул. Примерная, 123",
      telegram: "@mkm_furniture",
      whatsapp: "+79991234567",
    },
  });

  console.log("✅ Seed завершён");
  console.log(`   Категорий: ${categories.length}`);
  console.log("   Изделий: 4");
  console.log("   Заявок: 5");
  console.log("   Настройки: 1");
}

main()
  .catch((e) => {
    console.error("❌ Ошибка seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
