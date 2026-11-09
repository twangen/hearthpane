import type { HomeAssistantLike } from "./types";

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function localeFor(hass: HomeAssistantLike | undefined, configured?: string): string {
  return configured || hass?.locale?.language || document.documentElement.lang || navigator.language || "en-US";
}

export function timeZoneFor(hass: HomeAssistantLike | undefined, configured?: string): string | undefined {
  return configured || hass?.config?.time_zone;
}

export function timeParts(
  date: Date,
  locale: string,
  timeZone: string | undefined,
  hour12: boolean,
  showSeconds: boolean
): { time: string; period: string } {
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: showSeconds ? "2-digit" : undefined,
    hour12,
    timeZone
  });
  const parts = formatter.formatToParts(date);
  const period = parts.find((part) => part.type === "dayPeriod")?.value || "";
  const time = parts
    .filter((part) => part.type !== "dayPeriod")
    .map((part) => part.value)
    .join("")
    .trim();
  return { time, period };
}

export function fullDate(date: Date, locale: string, timeZone?: string, format = "full"): string {
  if (format === "short") {
    return new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric", timeZone }).format(date);
  }
  if (format === "numeric") {
    return new Intl.DateTimeFormat(locale, { year: "numeric", month: "numeric", day: "numeric", timeZone }).format(date);
  }
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone
  }).format(date);
}

export function formatTemperature(value: unknown, unit = "°"): string {
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number)}${unit}` : "—";
}

export function humanize(value: string): string {
  return value
    .replace(/^.*\./, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function eventDateKey(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : date.toISOString().slice(0, 10);
}

export function isoRange(days: number): { start: string; end: string } {
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + Math.max(1, days));
  return { start: startDate.toISOString(), end: endDate.toISOString() };
}

export function debounce<T extends (...args: never[]) => void>(callback: T, delay: number): T {
  let timer = 0;
  return ((...args: never[]) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => callback(...args), delay);
  }) as T;
}
