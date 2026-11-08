import { weekday } from "./calendar.js";

export function clinicsFromSettings(settings) {
  return Array.isArray(settings?.clinics) ? settings.clinics : [];
}

export function workDaysFromSettings(settings) {
  const fromClinics = clinicsFromSettings(settings).flatMap((clinic) => clinic.workDays || []);
  if (fromClinics.length) {
    return [...new Set(fromClinics)].sort((left, right) => left - right);
  }
  return settings?.workDays || [];
}

export function clinicForDate(dateISO, settings) {
  const day = weekday(dateISO, settings.timezone);
  return clinicsFromSettings(settings).find((clinic) => (clinic.workDays || []).includes(day)) || null;
}

export function clinicFields(clinic) {
  if (!clinic) return {};
  return {
    clinicId: clinic.id,
    clinicName: clinic.name,
    clinicAddress: clinic.address,
  };
}

export function clinicLabel(item) {
  const name = item?.clinicName || "";
  const address = item?.clinicAddress || "";
  if (name && address) return `${name}, ${address}`;
  return name || address;
}
