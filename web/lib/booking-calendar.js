import { interpolate, normalizeLocale } from "../../shared/i18n.js";
import { MESSAGES } from "./i18n";

export const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function weekdayLabels(intlLocale = "ru-RU") {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2024, 0, 1 + index);
    return new Intl.DateTimeFormat(intlLocale, { weekday: "short" }).format(date);
  });
}

export function toISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function monthLabel(year, month, locale = "ru") {
  const code = normalizeLocale(String(locale).slice(0, 2).toLowerCase());
  const pack = MESSAGES[code] || MESSAGES.ru;
  const name = pack.months?.[month] || MESSAGES.ru.months[month];
  return interpolate(pack.monthYear || MESSAGES.ru.monthYear, { month: name, year });
}

export function buildMonthCells(year, month) {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  return cells;
}
