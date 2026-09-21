"use client";

import { useState } from "react";

export interface MapLocation {
  id: string;
  title: string;
  address: string;
  lat: number | null;
  lon: number | null;
}

// Виджет Яндекс.Карт без API-ключа. ll и pt задаются как «долгота,широта».
// Метки ставим у всех магазинов, центрируем на выбранном.
function mapSrc(selected: MapLocation, all: MapLocation[]): string {
  if (selected.lat === null || selected.lon === null) {
    // Координат нет — Яндекс ищет место по тексту адреса
    return `https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(selected.address)}&z=16`;
  }

  const points = all
    .filter((l) => l.lat !== null && l.lon !== null)
    .map((l) => `${l.lon},${l.lat},pm2rdm`)
    .join("~");

  return `https://yandex.ru/map-widget/v1/?ll=${selected.lon},${selected.lat}&z=17&pt=${points}`;
}

export const LocationsMap = ({ locations }: { locations: MapLocation[] }) => {
  const [selectedId, setSelectedId] = useState(locations[0]?.id);
  const selected =
    locations.find((l) => l.id === selectedId) ?? locations[0];

  if (!selected) return null;

  return (
    <div>
      {locations.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {locations.map((location) => (
            <button
              key={location.id}
              type="button"
              onClick={() => setSelectedId(location.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                location.id === selected.id
                  ? "bg-primary text-white"
                  : "border border-border bg-white text-text hover:border-primary hover:text-primary"
              }`}
            >
              {location.title}
            </button>
          ))}
        </div>
      )}

      <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl bg-beige">
        <iframe
          key={selected.id}
          src={mapSrc(selected, locations)}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          title={`Карта: ${selected.title}`}
        />
      </div>
    </div>
  );
};
