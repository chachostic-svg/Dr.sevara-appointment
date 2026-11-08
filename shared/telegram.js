import { bookingCardCopy, formatBookingCard, formatHumanDate, localizedDoctor } from "./format.js";
import { normalizeLocale } from "./i18n.js";
import { translateCommentForGroup } from "./translate-text.js";

export function normalizeTelegramUsername(input) {
  let value = String(input || "").trim();
  if (!value) return "";
  value = value.replace(/^https?:\/\/(t\.me|telegram\.me)\//i, "");
  value = value.replace(/^@/, "");
  if (!/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(value)) return "";
  return value;
}

export async function resolveTelegramChatId(username) {
  const token = process.env.BOT_TOKEN;
  const handle = normalizeTelegramUsername(username);
  if (!token || !handle) return null;

  const response = await fetch(`https://api.telegram.org/bot${token}/getChat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: `@${handle}` }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data?.result?.id || null;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const GROUP_NOTIFY = {
  ru: {
    title: "Новая запись к Dr. Sevara",
    patient: "Пациент",
    phone: "Телефон",
    when: "Дата",
    at: "в",
    clinic: "Клиника",
    comment: "Комментарий",
    source: "Источник",
    sourceMini: "Mini App",
    sourceBot: "Telegram-бот",
    sourceWeb: "Сайт",
    cancelled: "Отменена",
    dash: "—",
  },
  uz: {
    title: "Dr. Sevara ga yangi yozuv",
    patient: "Bemor",
    phone: "Telefon",
    when: "Sana",
    at: "soat",
    clinic: "Klinika",
    comment: "Izoh",
    source: "Manba",
    sourceMini: "Mini App",
    sourceBot: "Telegram-bot",
    sourceWeb: "Sayt",
    cancelled: "Bekor qilindi",
    dash: "—",
  },
  en: {
    title: "New booking with Dr. Sevara",
    patient: "Patient",
    phone: "Phone",
    when: "Date",
    at: "at",
    clinic: "Clinic",
    comment: "Comment",
    source: "Source",
    sourceMini: "Mini App",
    sourceBot: "Telegram bot",
    sourceWeb: "Website",
    cancelled: "Cancelled",
    dash: "—",
  },
};

function groupNotifyCopy(locale) {
  return GROUP_NOTIFY[normalizeLocale(locale)];
}

export function formatAppointmentMessage(appointment, locale) {
  const copy = groupNotifyCopy(locale);
  const source =
    appointment.source === "mini"
      ? copy.sourceMini
      : appointment.source === "bot"
        ? copy.sourceBot
        : copy.sourceWeb;
  const comment = appointment.comment?.trim() ? appointment.comment.trim() : copy.dash;
  const clinic = [appointment.clinicName, appointment.clinicAddress].filter(Boolean).join(", ");
  const date = appointment.date ? formatHumanDate(appointment.date, "short", locale) : copy.dash;
  return [
    copy.title,
    `${copy.patient}: ${appointment.name}`,
    `${copy.phone}: ${appointment.phone}`,
    `${copy.when}: ${date} ${copy.at} ${appointment.time}`,
    clinic ? `${copy.clinic}: ${clinic}` : null,
    `${copy.comment}: ${comment}`,
    `${copy.source}: ${source}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function groupLocale() {
  const { getSettings } = await import("./store.js");
  const settings = await getSettings();
  return normalizeLocale(settings.telegramGroupLocale);
}

async function appointmentForGroup(appointment, locale) {
  const comment = await translateCommentForGroup(appointment, locale);
  return { ...appointment, comment };
}

export async function sendTelegramMessage(chatId, text, extra = {}) {
  const token = process.env.BOT_TOKEN;
  if (!token || !chatId) {
    return { skipped: true };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...extra,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Telegram send failed:", data);
      return { skipped: false, ok: false, details: data };
    }

    return { skipped: false, ok: true, messageId: data.result?.message_id };
  } catch (error) {
    console.error("Telegram send failed:", error);
    return { skipped: false, ok: false, details: { error: String(error) } };
  }
}

export async function editTelegramMessage(chatId, messageId, text, extra = {}) {
  const token = process.env.BOT_TOKEN;
  if (!token || !chatId || !messageId) {
    return { skipped: true };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        ...extra,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Telegram edit failed:", data);
      return { skipped: false, ok: false, details: data };
    }

    return { skipped: false, ok: true };
  } catch (error) {
    console.error("Telegram edit failed:", error);
    return { skipped: false, ok: false, details: { error: String(error) } };
  }
}

export async function notifyTelegramGroup(appointment) {
  const chatId = process.env.TELEGRAM_GROUP_ID;
  const locale = await groupLocale();
  const localized = await appointmentForGroup(appointment, locale);
  const result = await sendTelegramMessage(chatId, formatAppointmentMessage(localized, locale));
  if (result.ok && result.messageId) {
    const { updateAppointment } = await import("./store.js");
    await updateAppointment(appointment.id, { telegramGroupMessageId: result.messageId });
  }
  return result;
}

export async function strikeGroupAppointment(appointment) {
  const chatId = process.env.TELEGRAM_GROUP_ID;
  const locale = await groupLocale();
  const localized = await appointmentForGroup(appointment, locale);
  const text = formatAppointmentMessage(localized, locale);
  const html = `<s>${escapeHtml(text)}</s>\n<b>${groupNotifyCopy(locale).cancelled}</b>`;
  if (appointment.telegramGroupMessageId) {
    const edited = await editTelegramMessage(chatId, appointment.telegramGroupMessageId, html, {
      parse_mode: "HTML",
    });
    if (edited.ok || edited.skipped) return edited;
  }
  return sendTelegramMessage(chatId, html, { parse_mode: "HTML" });
}

export async function sendPatientBookingCard(appointment, doctor) {
  if (!appointment.telegramId) return { skipped: true };
  const locale = appointment.locale;
  const copy = bookingCardCopy(locale);
  const cardDoctor = localizedDoctor(locale, doctor);
  const result = await sendTelegramMessage(
    appointment.telegramId,
    formatBookingCard(appointment, cardDoctor, { locale }),
    {
      reply_markup: {
        inline_keyboard: [[{ text: copy.cancelBtn, callback_data: `cancel:${appointment.id}` }]],
      },
    }
  );
  if (result.ok && result.messageId) {
    const { updateAppointment } = await import("./store.js");
    await updateAppointment(appointment.id, { telegramPatientMessageId: result.messageId });
  }
  return result;
}

export async function strikePatientBookingCard(appointment, doctor) {
  if (!appointment.telegramId || !appointment.telegramPatientMessageId) return { skipped: true };
  const locale = appointment.locale;
  const copy = bookingCardCopy(locale);
  const cardDoctor = localizedDoctor(locale, doctor);
  return editTelegramMessage(
    appointment.telegramId,
    appointment.telegramPatientMessageId,
    `${formatBookingCard(appointment, cardDoctor, { locale, cancelled: true })}\n\n${copy.slotFreed}`,
    { reply_markup: { inline_keyboard: [] } }
  );
}
