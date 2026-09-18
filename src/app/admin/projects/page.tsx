"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ProjectForm } from "@/components/admin/ProjectForm";
import type { ProjectFormValues } from "@/lib/schemas";

interface ProjectFromApi {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  location: string | null;
  images: { id: string; url: string }[];
  isPublished: boolean;
  order: number;
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<ProjectFromApi[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProjectFromApi | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (project: ProjectFromApi) => {
    setEditing(project);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (values: ProjectFormValues) => {
    const url = editing ? `/api/projects/${editing.id}` : "/api/projects";
    const method = editing ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      alert(error.error ?? "Не удалось сохранить");
      return;
    }

    const saved: ProjectFromApi = await response.json();

    if (editing) {
      setProjects((prev) =>
        prev.map((p) => (p.id === editing.id ? saved : p)),
      );
    } else {
      setProjects((prev) => [...prev, saved]);
    }
    closeModal();
  };

  const handleDelete = async (project: ProjectFromApi) => {
    if (!confirm(`Удалить проект «${project.title}»?`)) return;

    const response = await fetch(`/api/projects/${project.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      alert("Не удалось удалить");
      return;
    }

    setProjects((prev) => prev.filter((p) => p.id !== project.id));
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-montserrat text-2xl font-bold text-text md:text-3xl">
            Проекты
          </h1>
          <p className="mt-1 text-sm text-text/60">
            Реализованные проекты в портфолио
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-dark"
        >
          <Plus size={16} />
          Добавить проект
        </button>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="border-b border-border bg-background/50">
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-text/50">
                <th className="px-5 py-3">Фото</th>
                <th className="px-5 py-3">Название</th>
                <th className="px-5 py-3">Локация</th>
                <th className="px-5 py-3">Порядок</th>
                <th className="px-5 py-3">Статус</th>
                <th className="px-5 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-16 text-center text-sm text-text/60"
                  >
                    Загрузка…
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-16 text-center text-sm text-text/60"
                  >
                    Пока нет проектов. Добавьте первый.
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr
                    key={project.id}
                    className="border-b border-border last:border-0 hover:bg-background/50"
                  >
                    <td className="px-5 py-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-beige">
                        {project.images[0]?.url && (
                          <Image
                            src={project.images[0].url}
                            alt={project.title}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-medium text-text">
                        {project.title}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-text/70">
                      {project.location ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-sm text-text/70">
                      {project.order}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          project.isPublished
                            ? "bg-green-50 text-green-700"
                            : "bg-yellow-50 text-yellow-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            project.isPublished
                              ? "bg-green-500"
                              : "bg-yellow-500"
                          }`}
                        />
                        {project.isPublished ? "Опубликован" : "Черновик"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(project)}
                          aria-label="Редактировать"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-text/60 transition hover:bg-beige hover:text-primary"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(project)}
                          aria-label="Удалить"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-text/60 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-sm text-text/60">
        Всего: {projects.length}
      </p>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editing ? "Редактировать проект" : "Новый проект"}
      >
        <ProjectForm
          project={editing ?? undefined}
          onSubmit={handleSubmit}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
}