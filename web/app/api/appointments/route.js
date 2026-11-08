import { getAppointments, getClients, getDoctor, getSettings } from "@/lib/store";
import { addAppointment, upsertClient } from "@/lib/store";
import { reminderMeta } from "@/lib/reminders";
import { clinicFields, clinicForDate, compareAppointmentsDesc, isSlotFree } from "@/lib/slots";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { normalizeTelegramUsername, notifyTelegramGroup, resolveTelegramChatId, sendPatientBookingCard } from "@/lib/telegram";
import { parseTelegramWebAppUser } from "@/lib/telegram-init";
import { isLocalMiniPreviewRequest } from "@/lib/mini-preview";
import { isLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSettings();
  const clients = await getClients();
  const nowMs = Date.now();
  const appointments = (await getAppointments())
    .sort(compareAppointmentsDesc)
    .map((item) => ({ ...item, ...reminderMeta(item, nowMs, settings.timezone, clients) }));
  return Response.json({ appointments });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const phone = normalizePhone(body.phone);
    const date = String(body.date || "");
    const time = String(body.time || "");
    const comment = String(body.comment || "").trim();
    const source = body.source === "mini" ? "mini" : body.source === "bot" ? "bot" : "web";
    const locale = isLocale(body.locale) ? body.locale : "";
    const rawTelegram = String(body.telegram || body.telegramUsername || "").trim();
    const telegramUsername = normalizeTelegramUsername(rawTelegram);
    if (source !== "mini" && rawTelegram && !telegramUsername) {
      return Response.json(
        { error: "Проверьте Telegram: укажите @username или оставьте поле пустым." },
        { status: 400 }
      );
    }

    let telegramId = null;
    let resolvedUsername = telegramUsername;
    if (source === "mini") {
      const initData = request.headers.get("x-telegram-init-data") || body.initData || "";
      const user = parseTelegramWebAppUser(initData, process.env.BOT_TOKEN);
      if (user?.id) {
        telegramId = user.id;
        resolvedUsername = user.username || telegramUsername;
      } else if (isLocalMiniPreviewRequest(request)) {
        telegramId = null;
      } else {
        return Response.json(
          { error: "Откройте запись из Telegram-бота, чтобы заявка сохранилась." },
          { status: 401 }
        );
      }
    } else if (source === "bot") {
      telegramId = body.telegramId || null;
    } else if (telegramUsername) {
      telegramId = await resolveTelegramChatId(telegramUsername);
    }

    if (!name || name.length < 2) {
      return Response.json({ error: "Укажите имя" }, { status: 400 });
    }
    if (!isValidPhone(body.phone) || !phone) {
      return Response.json({ error: "Укажите 9 цифр номера. Код +998 уже добавлен." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      return Response.json({ error: "Выберите день и время" }, { status: 400 });
    }
    if (!(await isSlotFree(date, time))) {
      return Response.json({ error: "Этот слот уже занят. Выберите другое время." }, { status: 409 });
    }

    const clinic = clinicForDate(date, await getSettings());
    if (!clinic) {
      return Response.json({ error: "В этот день приёма нет. Выберите другой день." }, { status: 400 });
    }

    const client = await upsertClient({ name, phone, telegramId, telegramUsername: resolvedUsername });
    const appointment = await addAppointment({
      clientId: client.id,
      name,
      phone,
      date,
      time,
      comment,
      source,
      status: "pending",
      telegramId,
      telegramUsername: resolvedUsername,
      locale,
      ...clinicFields(clinic),
    });

    const notify = await notifyTelegramGroup(appointment);
    const doctor = await getDoctor();
    const doctorCard = { name: doctor.name, title: doctor.title };
    if (source === "mini" && telegramId) {
      await sendPatientBookingCard(appointment, doctorCard);
    }
    return Response.json(
      {
        appointment,
        client,
        notify,
        doctor: doctorCard,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Не удалось создать запись" }, { status: 500 });
  }
}
