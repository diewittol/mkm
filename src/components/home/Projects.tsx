import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/layout/Container";
import { prisma } from "@/lib/prisma";

export const Projects = async () => {
  const projects = await prisma.project.findMany({
    where: { isPublished: true },
    include: { images: { orderBy: { order: "asc" }, take: 1 } },
    orderBy: { order: "asc" },
    take: 3,
  });

  if (projects.length === 0) {
    return null;
  }

  return (
    <section className="bg-text py-16 text-white lg:py-20">
      <Container>
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="font-montserrat text-sm font-medium uppercase tracking-widest text-primary">
              Портфолио
            </p>
            <h2 className="mt-3 font-montserrat text-3xl font-bold md:text-4xl">
              Реализованные проекты
            </h2>
          </div>

          <Link
            href="/projects"
            className="hidden text-sm font-medium text-white/70 transition hover:text-primary md:block"
          >
            Все проекты →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.slug}`}
              className="group block"
            >
              <article className="overflow-hidden rounded-2xl">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-white/5">
                  {project.images[0]?.url ? (
                    <Image
                      src={project.images[0].url}
                      alt={project.title}
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="object-cover transition group-hover:scale-[1.02]"
                    />
                  ) : null}
                </div>
                <div className="mt-4">
                  <h3 className="font-montserrat text-lg font-semibold">
                    {project.title}
                  </h3>
                  {project.location && (
                    <p className="mt-1 text-sm text-white/60">
                      {project.location}
                    </p>
                  )}
                </div>
              </article>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
};