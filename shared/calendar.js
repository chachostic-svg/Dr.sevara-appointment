export function timeToMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(total) {
  const hours = String(Math.floor(total / 60)).padStart(2, "0");
  const minutes = String(total % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatDateISO(date, timeZone = "Europe/Moscow") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function weekday(dateISO, timeZone = "Europe/Moscow") {
  const asUtc = new Date(`${dateISO}T12:00:00Z`);
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(asUtc);
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[day];
}

export function addDaysISO(dateISO, days) {
  const date = new Date(`${dateISO}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function nowMinutes(timeZone = "Europe/Moscow") {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour").value);
  const minute = Number(parts.find((part) => part.type === "minute").value);
  return hour * 60 + minute;
}

export function isActiveStatus(status) {
  return status === "pending" || status === "confirmed";
}

export function compareAppointmentsAsc(a, b) {
  return `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`);
}

export function compareAppointmentsDesc(a, b) {
  return `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`);
}

export { wallTimeToUtcMs } from "./when.js";
