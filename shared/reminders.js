import { isActiveStatus } from "./calendar.js";
import { formatHumanDate } from "./format.js";
import { wallTimeToUtcMs } from "./when.js";
import { getAppointments, getClients, getDoctor, getSettings, updateAppointment } from "./store.js";
import { resolveTelegramChatId, sendTelegramMessage } from "./telegram.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export function bookedViaTelegram(appointment) {
  return appointment.source === "bot" || appointment.source === "mini";
}

export function hasReminderContact(appointment, clients = []) {
  if (!bookedViaTelegram(appointment)) return false;
  if (appointment.telegramId || appointment.telegramUsername) return true;
  if (appointment.source !== "bot") return false;
  const client = clients.find(
    (item) => item.id === appointment.clientId || item.phone === appointment.phone
  );
  return Boolean(client?.telegramId);
}

export async function resolveTelegramId(appointment, clients) {
  if (!clients) clients = await getClients();
  if (appointment.telegramId) return appointment.telegramId;
  if (appointment.telegramUsername) {
    const chatId = await resolveTelegramChatId(appointment.telegramUsername);
    if (chatId) {
      await updateAppointment(appointment.id, { telegramId: chatId });
      appointment.telegramId = chatId;
      return chatId;
    }
  }
  if (appointment.source === "bot") {
    const client = clients.find(
      (item) => item.id === appointment.clientId || item.phone === appointment.phone
    );
    return client?.telegramId || null;
  }
  return null;
}

export function appointmentStartMs(appointment, timeZone) {
  return wallTimeToUtcMs(appointment.date, appointment.time, timeZone);
}

function clinicLine(appointment) {
  const clinic = [appointment.clinicName, appointment.clinicAddress].filter(Boolean).join(", ");
  return clinic ? `Клиника: ${clinic}.` : "";
}

export function formatReminderText(kind, appointment, doctor) {
  const doctorName = doctor?.name || "Хамидовой Севаре Миржалиловне";
  const when = `${formatHumanDate(appointment.date)} в ${appointment.time}`;
  const where = clinicLine(appointment);
  const phone = doctor?.contacts?.phone ? `Телефон администратора: ${doctor.contacts.phone}.` : "";

  if (kind === "day") {
    return [
      "Напоминание о приёме",
      "",
      `Завтра, ${when}, вы записаны к врачу ${doctorName}.`,
      where || null,
      phone || null,
      "",
      "Если нужно перенести визит, ответьте в этом чате или позвоните администратору.",
    ]
      .filter((line) => line != null)
      .join("\n");
  }

  if (kind === "hours") {
    return [
      "Напоминание о приёме",
      "",
      `Через 2 часа, в ${appointment.time}, приём у врача ${doctorName}. Ждём вас.`,
      where || null,
      phone || null,
    ]
      .filter((line) => line != null)
      .join("\n");
  }

  return [
    "Напоминание о приёме",
    "",
    `Вы записаны на ${when} к врачу ${doctorName}.`,
    where || null,
    phone || null,
    "",
    "Если планы изменились, ответьте в этом чате или позвоните администратору.",
  ]
    .filter((line) => line != null)
    .join("\n");
}

export function dueReminderKinds(appointment, nowMs, timeZone, clients = []) {
  if (!isActiveStatus(appointment.status) || !hasReminderContact(appointment, clients)) return [];
  const start = appointmentStartMs(appointment, timeZone);
  if (!Number.isFinite(start) || nowMs >= start) return [];

  const sent = appointment.reminders || {};
  const kinds = [];
  if (!sent.day && nowMs >= start - DAY_MS && nowMs < start - TWO_HOURS_MS) {
    kinds.push("day");
  }
  if (!sent.hours && nowMs >= start - TWO_HOURS_MS) {
    kinds.push("hours");
  }
  return kinds;
}

export async function sendAppointmentReminder(appointment, kind, options = {}) {
  const doctor = options.doctor || (await getDoctor());
  const clients = options.clients || (await getClients());
  const chatId = await resolveTelegramId(appointment, clients);

  if (!chatId) {
    return {
      ok: false,
      error: appointment.telegramUsername
        ? "Клиент указал Telegram, но ещё не написал боту. Напоминание не отправлено."
        : "Telegram не указан — напоминание не отправляем.",
    };
  }

  const result = await sendTelegramMessage(chatId, formatReminderText(kind, appointment, doctor));
  if (result.skipped) {
    return { ok: false, error: "Не задан BOT_TOKEN — напоминание не отправлено." };
  }
  if (!result.ok) {
    return { ok: false, error: "Telegram не принял сообщение. Клиент мог заблокировать бота." };
  }

  const reminders = {
    ...(appointment.reminders || {}),
    [kind]: new Date().toISOString(),
  };
  const updated = await updateAppointment(appointment.id, { reminders });
  return { ok: true, appointment: updated };
}

export async function processDueReminders(now = new Date()) {
  const settings = await getSettings();
  const doctor = await getDoctor();
  const clients = await getClients();
  const nowMs = now.getTime();
  const sent = [];

  for (const appointment of await getAppointments()) {
    const kinds = dueReminderKinds(appointment, nowMs, settings.timezone, clients);
    if (!kinds.length) continue;

    for (const kind of kinds) {
      const result = await sendAppointmentReminder(appointment, kind, { doctor, clients });
      if (result.ok) {
        sent.push({ id: appointment.id, kind });
        appointment.reminders = result.appointment.reminders;
      }
    }
  }

  return { sent, at: now.toISOString() };
}

export function reminderMeta(appointment, nowMs, timeZone, clients = []) {
  const start = appointmentStartMs(appointment, timeZone);
  const upcoming = isActiveStatus(appointment.status) && nowMs < start;
  const hasTelegram = hasReminderContact(appointment, clients);
  return {
    hasTelegram,
    canRemind: upcoming && hasTelegram,
    reminders: appointment.reminders || {},
  };
}
