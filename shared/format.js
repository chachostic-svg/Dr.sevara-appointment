import { normalizeLocale } from "./i18n.js";

const CARD = {
  ru: {
    done: "Готово. Вы записаны.",
    cancelled: "Запись отменена.",
    date: "Дата",
    time: "Время",
    clinic: "Клиника",
    address: "Адрес",
    doctor: "Врач",
    dash: "—",
    cancelBtn: "Отменить запись",
    slotFreed: "Это время снова свободно.",
  },
  uz: {
    done: "Tayyor. Siz yozildingiz.",
    cancelled: "Yozuv bekor qilindi.",
    date: "Sana",
    time: "Vaqt",
    clinic: "Klinika",
    address: "Manzil",
    doctor: "Shifokor",
    dash: "—",
    cancelBtn: "Yozuvni bekor qilish",
    slotFreed: "Bu vaqt yana bo‘sh.",
  },
  en: {
    done: "Done. You are booked.",
    cancelled: "The appointment is cancelled.",
    date: "Date",
    time: "Time",
    clinic: "Clinic",
    address: "Address",
    doctor: "Doctor",
    dash: "—",
    cancelBtn: "Cancel appointment",
    slotFreed: "This time is free again.",
  },
};

const DOCTOR = {
  ru: { name: "Хамидова Севара Миржалиловна", title: "Врач-невролог" },
  uz: { name: "Xamidova Sevara Mirjalilovna", title: "Shifokor-nevrolog" },
  en: { name: "Sevara Mirjalilovna Khamidova", title: "Neurologist" },
};

export function bookingCardCopy(locale) {
  return CARD[normalizeLocale(locale)];
}

export function localizedDoctor(locale, doctor = {}) {
  return DOCTOR[normalizeLocale(locale)] || doctor;
}

const MONTHS = {
  ru: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
  uz: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};

const WEEKDAYS = {
  long: {
    ru: ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"],
    uz: ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"],
    en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  },
  short: {
    ru: ["вс", "пн", "вт", "ср", "чт", "пт", "сб"],
    uz: ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"],
    en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  },
};

export function formatHumanDate(dateISO, weekday = "long", locale = "ru") {
  const code = normalizeLocale(locale);
  const date = new Date(`${dateISO}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.getDate();
  const month = MONTHS[code][date.getMonth()];
  const wd = WEEKDAYS[weekday === "short" ? "short" : "long"][code][date.getDay()];
  if (code === "en") return `${wd}, ${month} ${day}`;
  if (code === "uz") return `${wd}, ${day}-${month}`;
  return `${wd}, ${day} ${month}`;
}

export function formatBookingCard(appointment = {}, doctor = {}, options = {}) {
  const locale = normalizeLocale(options.locale || appointment.locale);
  const copy = bookingCardCopy(locale);
  const cardDoctor = localizedDoctor(locale, doctor);
  const date = appointment.date ? formatHumanDate(appointment.date, "long", locale) : copy.dash;
  const doctorLine = [cardDoctor.name, cardDoctor.title].filter(Boolean).join(", ") || copy.dash;
  return [
    options.cancelled ? copy.cancelled : copy.done,
    "",
    `${copy.date}: ${date}`,
    `${copy.time}: ${appointment.time || copy.dash}`,
    `${copy.clinic}: ${appointment.clinicName || copy.dash}`,
    `${copy.address}: ${appointment.clinicAddress || copy.dash}`,
    `${copy.doctor}: ${doctorLine}`,
  ].join("\n");
}

export function formatPrice(value) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export function statusLabel(status) {
  if (status === "confirmed") return "Подтверждена";
  if (status === "cancelled") return "Отменена";
  return "Ожидает";
}

export function sourceLabel(source) {
  if (source === "mini") return "запись с Mini App";
  if (source === "bot") return "запись с Telegram";
  return "запись с сайта";
}

export function visitCountLabel(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} визит`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} визита`;
  return `${count} визитов`;
}
