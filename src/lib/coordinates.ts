// Координаты в том виде, как их копируют из Яндекс/Google Карт:
// «44.672187, 39.972452» (широта, долгота). Без зависимостей.

export interface Coordinates {
  lat: number;
  lon: number;
}

const NUMBER = String.raw`-?\d{1,3}(?:\.\d+)?`;
const PAIR = new RegExp(String.raw`^\s*(${NUMBER})\s*[,;\s]\s*(${NUMBER})\s*$`);

export const COORDINATES_ERROR =
  "Введите широту и долготу через запятую, например 44.672187, 39.972452";

export function parseCoordinates(input: string): Coordinates | null {
  const match = PAIR.exec(input);
  if (!match) return null;

  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;

  return { lat, lon };
}

export const formatCoordinates = (lat: number | null, lon: number | null) =>
  lat !== null && lon !== null ? `${lat}, ${lon}` : "";
