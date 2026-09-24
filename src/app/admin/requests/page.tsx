"use client";

import { useEffect, useState } from "react";
import { Eye, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ApplicationForm } from "@/components/admin/ApplicationForm";
import { ApplicationNotes } from "@/components/admin/ApplicationNotes";
import { ApplicationPrice } from "@/components/admin/ApplicationPrice";
import { ApplicationExpenses } from "@/components/admin/ApplicationExpenses";
import { MoneyStats } from "@/components/admin/MoneyStats";
import { formatRub } from "@/lib/money";
import type { ManualApplicationValues } from "@/lib/schemas";
import {
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
} from "@/types/application";

interface ApplicationFromApi {
  id: string;
  name: string;
  phone: string;
  message: string | null;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  handledBy: string | null;
  handledAt: string | null;
  source: string;
  price: number | null;
  _count?: { notes: number };
  product: { id: string; name: string; slug: string } | null;
}

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  new: "bg-blue-50 text-blue-700",
  in_progress: "bg-yellow-50 text-yellow-700",
  done: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
};

const STATUS_DOT: Record<ApplicationStatus, string> = {
  new: "bg-blue-500",
  in_progress: "bg-yellow-500",
  done: "bg-green-500",
  rejected: "bg-red-500",
};

const STATUS_FILTERS: { value: ApplicationStatus | ""; label: string }[] = [
  { value: "", label: "Все статусы" },
  { value: "new", label: "Новые" },
  { value: "in_progress", label: "В работе" },
  { value: "done", label: "Обработанные" },
  { value: "rejected", label: "Отклонённые" },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function AdminRequestsPage() {
  const [applications, setApplications] = useState<ApplicationFromApi[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "">("");
  const [viewing, setViewing] = useState<ApplicationFromApi | null>(null);
  const [isCreating, setCreating] = useState(false);

  // Загрузка списка
  useEffect(() => {
    fetch("/api/applications")
      .then((r) => r.json())
      .then(setApplications)
      .finally(() => setLoading(false));
  }, []);

  const filtered = statusFilter
    ? applications.filter((a) => a.status === statusFilter)
    : applications;

  const handleDelete = async (app: ApplicationFromApi) => {
    if (!confirm(`Удалить заявку от «${app.name}»?`)) return;

    const response = await fetch(`/api/applications/${app.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      alert("Не удалось удалить");
      return;
    }

    setApplications((prev) => prev.filter((a) => a.id !== app.id));
  };

  const handleCreate = async (values: ManualApplicationValues) => {
    const response = await fetch("/api/admin/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      alert(error.error ?? "Не удалось добавить заявку");
      return;
    }

    const created: ApplicationFromApi = await response.json();
    setApplications((prev) => [created, ...prev]);
    setCreating(false);
  };

  const changeStatus = async (id: string, status: ApplicationStatus) => {
    const response = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      alert("Не удалось изменить статус");
      return;
    }

    const updated = await response.json();

    const changes = {
      status: updated.status,
      handledBy: updated.handledBy,
      handledAt: updated.handledAt,
    };
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...changes } : a)),
    );
    setViewing((prev) =>
      prev && prev.id === id ? { ...prev, ...changes } : prev,
    );
  };

  return (
    <div>
      {/* Заголовок */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-montserrat text-2xl font-bold text-text md:text-3xl">
            Заявки
          </h1>
          <p className="mt-1 text-sm text-text/60">
            Заявки с сайта: с формы «Узнать стоимость» и со страницы контактов,
            а также добавленные вручную
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-dark"
        >
          <Plus size={16} />
          Добавить заявку
        </button>
      </div>

      {/* Сводка по стоимости */}
      {!isLoading && <MoneyStats applications={applications} />}

      {/* Фильтр */}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as ApplicationStatus | "")
          }
          className="rounded-lg border border-border bg-white px-4 py-3 text-sm text-text outline-none transition focus:border-primary"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value || "all"} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Таблица */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="table-stack-xl w-full">
            <thead className="border-b border-border bg-background/50">
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-text/50">
                <th className="px-5 py-3">Имя</th>
                <th className="px-5 py-3">Телефон</th>
                <th className="px-5 py-3">Товар / тема</th>
                <th className="px-5 py-3">Статус</th>
                <th className="px-5 py-3">Стоимость</th>
                <th className="px-5 py-3">Дата</th>
                <th className="px-5 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-16 text-center text-sm text-text/60"
                  >
                    Загрузка…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-16 text-center text-sm text-text/60"
                  >
                    Заявок нет
                  </td>
                </tr>
              ) : (
                filtered.map((app) => (
                  <tr
                    key={app.id}
                    className="border-b border-border last:border-0 hover:bg-background/50"
                  >
                    <td className="px-5 py-3">
                      <div>
                        <span className="font-medium text-text">{app.name}</span>
                        {(app._count?.notes ?? 0) > 0 && (
                          <span className="ml-2 text-xs text-text/40">
                            заметок: {app._count?.notes}
                          </span>
                        )}
                        {app.source === "manual" && (
                          <span className="ml-2 rounded-full bg-beige px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                            вручную
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-text/70" data-label="Телефон">
                      {app.phone}
                    </td>
                    <td className="px-5 py-3 text-sm text-text/70" data-label="Товар / тема">
                      <span className="line-clamp-1 max-w-[280px]">
                        {app.product?.name ?? app.message ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3" data-label="Статус">
                      <div>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[app.status]}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[app.status]}`}
                          />
                          {APPLICATION_STATUS_LABELS[app.status]}
                        </span>
                        {app.handledBy && (
                          <p className="mt-1 text-xs text-text/50">
                            {app.handledBy}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-text/70" data-label="Стоимость">
                      {app.price ? formatRub(app.price) : "—"}
                    </td>
                    <td className="px-5 py-3 text-sm text-text/60" data-label="Дата">
                      {formatDate(app.createdAt)}
                    </td>
                    <td className="px-5 py-3" data-actions>
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setViewing(app)}
                          aria-label="Просмотреть"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-text/60 transition hover:bg-beige hover:text-primary"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(app)}
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
        Найдено: {filtered.length} из {applications.length}
      </p>

      {/* Модалка */}
      {/* Добавление заявки вручную */}
      <Modal
        isOpen={isCreating}
        onClose={() => setCreating(false)}
        title="Новая заявка"
      >
        <ApplicationForm
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
        />
      </Modal>

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title="Заявка">
        {viewing && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text/50">
                  Имя
                </p>
                <p className="mt-1 text-sm text-text">{viewing.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text/50">
                  Телефон
                </p>
                <a
                  href={`tel:${viewing.phone.replace(/[^\d+]/g, "")}`}
                  className="mt-1 block text-sm text-primary hover:text-primary-dark"
                >
                  {viewing.phone}
                </a>
              </div>
            </div>

            {viewing.product && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text/50">
                  Товар
                </p>
                <p className="mt-1 text-sm text-text">{viewing.product.name}</p>
              </div>
            )}

            {viewing.message && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text/50">
                  Сообщение
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-text">
                  {viewing.message}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-text/50">
                Дата заявки
              </p>
              <p className="mt-1 text-sm text-text/70">
                {formatDate(viewing.createdAt)}
              </p>
            </div>

            {viewing.handledBy && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text/50">
                  Статус изменил(а)
                </p>
                <p className="mt-1 text-sm text-text/70">
                  {viewing.handledBy}
                  {viewing.handledAt && `, ${formatDate(viewing.handledAt)}`}
                </p>
              </div>
            )}

            <ApplicationNotes
              key={viewing.id}
              applicationId={viewing.id}
              onCountChange={(count) => {
                const patchCount = (a: ApplicationFromApi) =>
                  a.id === viewing.id ? { ...a, _count: { notes: count } } : a;
                setApplications((prev) => prev.map(patchCount));
              }}
            />

            <ApplicationPrice
              key={viewing.id}
              applicationId={viewing.id}
              price={viewing.price}
              onSaved={(price) => {
                setApplications((prev) =>
                  prev.map((a) => (a.id === viewing.id ? { ...a, price } : a)),
                );
                setViewing((prev) => (prev && prev.id === viewing.id ? { ...prev, price } : prev));
              }}
            />

            <ApplicationExpenses key={viewing.id} applicationId={viewing.id} price={viewing.price} />

            <div className="border-t border-border pt-5">
              <p className="text-xs font-medium uppercase tracking-wider text-text/50">
                Статус
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.keys(APPLICATION_STATUS_LABELS) as ApplicationStatus[]).map(
                  (status) => {
                    const isActive = viewing.status === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => changeStatus(viewing.id, status)}
                        className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                          isActive
                            ? "bg-primary text-white"
                            : "border border-border bg-white text-text hover:border-primary hover:text-primary"
                        }`}
                      >
                        {APPLICATION_STATUS_LABELS[status]}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <div className="flex gap-3 border-t border-border pt-5">
              <a
                href={`tel:${viewing.phone.replace(/[^\d+]/g, "")}`}
                className="flex-1 rounded-lg bg-primary px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-primary-dark"
              >
                Позвонить
              </a>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="rounded-lg border border-border bg-white px-4 py-3 text-sm font-medium text-text transition hover:border-primary hover:text-primary"
              >
                Закрыть
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}