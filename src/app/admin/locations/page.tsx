"use client";

import { useEffect, useState } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { LocationForm } from "@/components/admin/LocationForm";
import { formatCoordinates } from "@/lib/coordinates";
import type { LocationFormValues } from "@/lib/schemas";

interface LocationFromApi {
  id: string;
  title: string;
  address: string;
  hours: string | null;
  lat: number | null;
  lon: number | null;
}

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<LocationFromApi[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [editing, setEditing] = useState<LocationFromApi | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then(setLocations)
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (location: LocationFromApi) => {
    setEditing(location);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (values: LocationFormValues) => {
    const url = editing ? `/api/locations/${editing.id}` : "/api/locations";

    const response = await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      alert(error.error ?? "Не удалось сохранить");
      return;
    }

    const saved: LocationFromApi = await response.json();
    setLocations((prev) =>
      editing
        ? prev.map((l) => (l.id === editing.id ? saved : l))
        : [...prev, saved],
    );
    closeModal();
  };

  const handleDelete = async (location: LocationFromApi) => {
    if (!confirm(`Удалить адрес «${location.title}»?`)) return;

    const response = await fetch(`/api/locations/${location.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      alert("Не удалось удалить");
      return;
    }
    setLocations((prev) => prev.filter((l) => l.id !== location.id));
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-montserrat text-2xl font-bold text-text md:text-3xl">
            Адреса
          </h1>
          <p className="mt-1 text-sm text-text/60">
            Магазины и точки, которые видны на странице контактов, в подвале
            сайта и на карте
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-dark"
        >
          <Plus size={16} />
          Добавить адрес
        </button>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-border bg-background/50">
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-text/50">
                <th className="px-5 py-3">Название</th>
                <th className="px-5 py-3">Адрес</th>
                <th className="px-5 py-3">Часы работы</th>
                <th className="px-5 py-3">Координаты</th>
                <th className="px-5 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-16 text-center text-sm text-text/60"
                  >
                    Загрузка…
                  </td>
                </tr>
              ) : locations.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-16 text-center text-sm text-text/60"
                  >
                    Пока нет адресов. Добавьте первый.
                  </td>
                </tr>
              ) : (
                locations.map((location) => (
                  <tr
                    key={location.id}
                    className="border-b border-border last:border-0 hover:bg-background/50"
                  >
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-2 font-medium text-text">
                        <MapPin size={16} className="text-primary" />
                        {location.title}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-text/70">
                      {location.address}
                    </td>
                    <td className="px-5 py-3 text-sm text-text/70">
                      {location.hours ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-sm text-text/70">
                      {formatCoordinates(location.lat, location.lon) ||
                        "по адресу"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(location)}
                          aria-label="Редактировать"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-text/60 transition hover:bg-beige hover:text-primary"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(location)}
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

      <p className="mt-4 text-sm text-text/60">Всего: {locations.length}</p>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editing ? "Редактировать адрес" : "Новый адрес"}
      >
        <LocationForm
          key={editing?.id ?? "new"}
          defaultValues={
            editing
              ? {
                  title: editing.title,
                  address: editing.address,
                  hours: editing.hours ?? "",
                  coordinates: formatCoordinates(editing.lat, editing.lon),
                }
              : undefined
          }
          onSubmit={handleSubmit}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
}
