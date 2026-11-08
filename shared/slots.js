import {
  addDaysISO,
  compareAppointmentsAsc,
  formatDateISO,
  isActiveStatus,
  minutesToTime,
  nowMinutes,
  timeToMinutes,
  weekday,
} from "./calendar.js";
import { clinicFields, clinicForDate, clinicsFromSettings, workDaysFromSettings } from "./clinics.js";
import { getAppointments, getClients, getSettings } from "./store.js";

export {
  addDaysISO,
  compareAppointmentsAsc,
  compareAppointmentsDesc,
  formatDateISO,
  isActiveStatus,
  minutesToTime,
  nowMinutes,
  timeToMinutes,
  weekday,
} from "./calendar.js";
export { clinicFields, clinicForDate, clinicLabel } from "./clinics.js";

export function buildDaySlots(dateISO, settings, appointments, options = {}) {
  const { includePast = false } = options;
  const clinic = clinicForDate(dateISO, settings);
  const workDays = workDaysFromSettings(settings);
  if (!clinic && !workDays.includes(weekday(dateISO, settings.timezone))) {
    return [];
  }
  if (clinicsFromSettings(settings).length && !clinic) {
    return [];
  }

  const taken = new Set(
    appointments
      .filter((item) => item.date === dateISO && isActiveStatus(item.status))
      .map((item) => item.time)
  );

  const start = timeToMinutes(settings.workStart);
  const end = timeToMinutes(settings.workEnd);
  const lunchStart = timeToMinutes(settings.lunchStart);
  const lunchEnd = timeToMinutes(settings.lunchEnd);
  const today = formatDateISO(new Date(), settings.timezone);
  const currentMinutes = nowMinutes(settings.timezone);

  const slots = [];
  for (let time = start; time + settings.slotMinutes <= end; time += settings.slotMinutes) {
    if (time >= lunchStart && time < lunchEnd) continue;
    const label = minutesToTime(time);
    const isPast = dateISO < today || (dateISO === today && time <= currentMinutes);
    slots.push({
      date: dateISO,
      time: label,
      available: !taken.has(label) && (includePast || !isPast),
      past: isPast,
      ...clinicFields(clinic),
    });
  }
  return slots;
}

export async function getSlotsRange(fromISO, toISO, options = {}) {
  const settings = await getSettings();
  const appointments = await getAppointments();
  const days = {};
  let cursor = fromISO;

  while (cursor <= toISO) {
    days[cursor] = buildDaySlots(cursor, settings, appointments, options);
    cursor = addDaysISO(cursor, 1);
  }

  return { settings, days };
}

export async function isSlotFree(dateISO, time) {
  const settings = await getSettings();
  const appointments = await getAppointments();
  const slots = buildDaySlots(dateISO, settings, appointments);
  const slot = slots.find((item) => item.time === time);
  return Boolean(slot?.available);
}

export function occupancyForDate(dateISO, settings, appointments) {
  const slots = buildDaySlots(dateISO, settings, appointments, { includePast: true });
  const total = slots.length;
  const taken = slots.filter((slot) => {
    return appointments.some(
      (item) => item.date === dateISO && item.time === slot.time && isActiveStatus(item.status)
    );
  }).length;

  return {
    date: dateISO,
    total,
    taken,
    free: Math.max(total - taken, 0),
    percent: total ? Math.round((taken / total) * 100) : 0,
  };
}

export async function getStats() {
  const settings = await getSettings();
  const appointments = await getAppointments();
  const clients = await getClients();
  const today = formatDateISO(new Date(), settings.timezone);
  const weekDates = [];
  let cursor = today;
  while (weekDates.length < 7) {
    weekDates.push(cursor);
    cursor = addDaysISO(cursor, 1);
  }

  const week = weekDates.map((date) => occupancyForDate(date, settings, appointments));
  const upcoming = appointments
    .filter((item) => isActiveStatus(item.status) && item.date >= today)
    .sort(compareAppointmentsAsc)
    .slice(0, 8);

  const pending = appointments.filter(
    (item) => item.status === "pending" && item.date >= today
  ).length;

  return {
    today: occupancyForDate(today, settings, appointments),
    week,
    upcoming,
    pending,
    totals: {
      appointments: appointments.length,
      clients: clients.length,
    },
  };
}
