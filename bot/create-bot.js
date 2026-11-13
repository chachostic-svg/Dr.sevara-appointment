import { Bot, InlineKeyboard, Keyboard, session } from "grammy";
import { formatLocalPhone, isValidPhone, localPhoneDigits, normalizePhone } from "../shared/phone.js";
import { addDaysISO, formatDateISO } from "../shared/calendar.js";
import { formatBookingCard, formatHumanDate, localizedDoctor } from "../shared/format.js";
import { DEFAULT_LOCALE, isLocale, normalizeLocale } from "../shared/i18n.js";
import { clinicFields, clinicForDate, getSlotsRange, isSlotFree } from "../shared/slots.js";
import {
  addAppointment,
  deleteBotSession,
  findAppointment,
  getDoctor,
  getSettings,
  patchSettings,
  readBotSession,
  updateAppointment,
  upsertClient,
  writeBotSession,
} from "../shared/store.js";
import {
  flushUnsentGroupAppointments,
  normalizeTelegramUsername,
  notifyTelegramGroup,
  strikeGroupAppointment,
} from "../shared/telegram.js";
import { translate } from "./i18n.js";

const CHAT_LABELS = ["В чате", "Chatda", "In chat"];
const SKIP_TEXT = [
  ...CHAT_LABELS,
  "Записаться",
  "Отмена",
  "Мои данные",
  "Пропустить",
  "/start",
];

function isTunnelUrl(value) {
  return /trycloudflare\.com|ngrok/i.test(String(value || ""));
}

function webAppUrl() {
  const explicit = String(process.env.WEBAPP_URL || "").trim();
  if (/^https:\/\//i.test(explicit) && !(process.env.VERCEL && isTunnelUrl(explicit))) {
    return explicit;
  }
  const origin = publicSiteUrl();
  return origin ? `${origin}/mini` : "";
}

function groupId() {
  return process.env.TELEGRAM_GROUP_ID;
}

function initialSession() {
  return {
    step: "idle",
    afterLang: "intro",
    locale: "",
    name: "",
    phone: "",
    date: "",
    time: "",
    comment: "",
  };
}

function isGroup(ctx) {
  const type = ctx.chat?.type;
  return type === "group" || type === "supergroup";
}

function neonSessionStorage() {
  return {
    async read(key) {
      return readBotSession(key);
    },
    async write(key, value) {
      await writeBotSession(key, value);
    },
    async delete(key) {
      await deleteBotSession(key);
    },
  };
}

export function createBot(token = process.env.BOT_TOKEN) {
  if (!token) {
    throw new Error("BOT_TOKEN не задан");
  }

  const bot = new Bot(token);

  bot.use(
    session({
      initial: initialSession,
      getSessionKey(ctx) {
        const userId = ctx.from?.id;
        if (userId == null) return undefined;
        return `u:${userId}`;
      },
      storage: process.env.DATABASE_URL ? neonSessionStorage() : undefined,
    })
  );

  function localeOf(ctx) {
    return normalizeLocale(ctx.session.locale);
  }

  function t(ctx, path, vars) {
    return translate(localeOf(ctx), path, vars);
  }

  function todayISO() {
    return formatDateISO(new Date());
  }

  function humanDate(dateISO, locale) {
    return formatHumanDate(dateISO, "short", locale);
  }

  function langKeyboard() {
    return new InlineKeyboard()
      .text(translate("ru", "lang.ru"), "lang:ru")
      .text(translate("ru", "lang.uz"), "lang:uz")
      .text(translate("ru", "lang.en"), "lang:en");
  }

  function mainKeyboard(locale) {
    return new Keyboard().text(translate(normalizeLocale(locale), "bot.inChat")).resized().persistent();
  }

  function homeMarkup(ctx, locale) {
    const lang = normalizeLocale(locale);
    if (isGroup(ctx)) {
      const username = ctx.me?.username;
      if (!username) return undefined;
      return new InlineKeyboard().url(
        translate(lang, "bot.menu"),
        `https://t.me/${username}?start=book`
      );
    }
    return mainKeyboard(lang);
  }

  async function replyHome(ctx, text, locale) {
    const markup = homeMarkup(ctx, locale);
    try {
      await ctx.reply(text, markup ? { reply_markup: markup } : {});
    } catch (error) {
      console.error("Не удалось отправить сообщение с кнопкой:", error);
      await ctx.reply(text);
    }
  }

  function introKey(ctx) {
    if (isGroup(ctx)) return "bot.introGroup";
    return webAppUrl() ? "bot.intro" : "bot.introChatOnly";
  }

  function menuHintKey(ctx) {
    return isGroup(ctx) ? "bot.menuHintGroup" : "bot.menuHint";
  }

  function miniAppMenuButton(locale) {
    return {
      type: "web_app",
      text: translate(normalizeLocale(locale), "bot.menu"),
      web_app: { url: webAppUrl() },
    };
  }

  async function attachMiniAppMenu(ctx, locale = DEFAULT_LOCALE) {
    if (!webAppUrl() || isGroup(ctx)) return;
    await bot.api.setChatMenuButton({
      chat_id: ctx.chat.id,
      menu_button: miniAppMenuButton(locale),
    });
  }

  async function rememberGroupChat(ctx, extra = {}) {
    if (!isGroup(ctx) || !ctx.chat?.id) return;
    const chatId = String(ctx.chat.id);
    try {
      const current = await getSettings();
      if (String(current.telegramGroupId || "") !== chatId || Object.keys(extra).length > 0) {
        await patchSettings({ telegramGroupId: chatId, ...extra });
      }
    } catch (error) {
      console.error("Не удалось сохранить настройки группы:", error);
    }
  }

  bot.use(async (ctx, next) => {
    if (isGroup(ctx) && ctx.chat?.id) {
      await rememberGroupChat(ctx);
    }
    await next();
  });

  async function welcomeGroup(ctx) {
    await rememberGroupChat(ctx);
    await ctx.reply(translate("ru", "lang.askCommands"));
    await flushUnsentGroupAppointments();
  }

  async function askLanguage(ctx, afterLang) {
    ctx.session.step = "lang";
    ctx.session.afterLang = afterLang;
    if (isGroup(ctx)) {
      await rememberGroupChat(ctx);
      await ctx.reply(translate("ru", "lang.askCommands"));
      await flushUnsentGroupAppointments();
      return;
    }
    await ctx.reply(translate("ru", "lang.ask"), { reply_markup: langKeyboard() });
  }

  async function saveGroupLocale(ctx, locale) {
    ctx.session.locale = locale;
    ctx.session.step = "idle";
    ctx.session.afterLang = "intro";
    try {
      const patch = { telegramGroupLocale: locale };
      if (ctx.chat?.id) {
        patch.telegramGroupId = String(ctx.chat.id);
      }
      await patchSettings(patch);
    } catch (error) {
      console.error("Не удалось сохранить язык группы:", error);
    }
    await ctx.reply(translate(locale, "bot.langSaved"));
    await flushUnsentGroupAppointments();
  }

  async function startChatBooking(ctx) {
    if (isGroup(ctx)) {
      await askLanguage(ctx, "intro");
      return;
    }
    const locale = isLocale(ctx.session.locale) ? ctx.session.locale : "";
    ctx.session = { ...initialSession(), locale, step: locale ? "name" : "lang", afterLang: "name" };
    if (locale) {
      await ctx.reply(t(ctx, "bot.askName"), { reply_markup: mainKeyboard(locale) });
      return;
    }
    await askLanguage(ctx, "name");
  }

  async function fetchSlots(from, to) {
    return getSlotsRange(from, to);
  }

  async function askDate(ctx) {
    ctx.session.step = "date";
    const from = todayISO();
    const to = addDaysISO(from, 21);
    const locale = localeOf(ctx);
    try {
      const payload = await fetchSlots(from, to);
      const keyboard = new InlineKeyboard();
      const days = [];
      for (const [date, slots] of Object.entries(payload.days || {})) {
        const free = (slots || []).filter((slot) => slot.available);
        if (!free.length) continue;
        days.push(date);
        if (days.length >= 10) break;
      }
      days.forEach((date, index) => {
        const clinicName = (payload.days?.[date] || []).find((slot) => slot.clinicName)?.clinicName || "";
        const shortClinic = clinicName.includes("Medion")
          ? "Medion"
          : clinicName.includes("CityMed")
            ? "CityMed"
            : "";
        keyboard.text(
          shortClinic ? `${humanDate(date, locale)} · ${shortClinic}` : humanDate(date, locale),
          `date:${date}`
        );
        if (index % 2 === 1) keyboard.row();
      });
      if (!days.length) {
        await ctx.reply(t(ctx, "bot.noDays"), {
          reply_markup: mainKeyboard(locale),
        });
        ctx.session = { ...initialSession(), locale: ctx.session.locale };
        return;
      }
      await ctx.reply(t(ctx, "bot.pickDay"), { reply_markup: keyboard });
    } catch {
      await ctx.reply(t(ctx, "bot.calendarFail"), {
        reply_markup: mainKeyboard(locale),
      });
      ctx.session = { ...initialSession(), locale: ctx.session.locale };
    }
  }

  async function askTime(ctx) {
    const locale = localeOf(ctx);
    try {
      const payload = await fetchSlots(ctx.session.date, ctx.session.date);
      const free = (payload.days?.[ctx.session.date] || []).filter((slot) => slot.available);
      if (!free.length) {
        await ctx.reply(t(ctx, "bot.noSlotsDay"), {
          reply_markup: mainKeyboard(locale),
        });
        await askDate(ctx);
        return;
      }
      const keyboard = new InlineKeyboard();
      free.forEach((slot, index) => {
        keyboard.text(slot.time, `time:${slot.time}`);
        if (index % 3 === 2) keyboard.row();
      });
      const clinicName = free[0]?.clinicName;
      const clinicAddress = free[0]?.clinicAddress;
      const where = clinicName ? `\n${clinicName}${clinicAddress ? `, ${clinicAddress}` : ""}` : "";
      await ctx.reply(t(ctx, "bot.slotsOn", { date: humanDate(ctx.session.date, locale), where }), {
        reply_markup: keyboard,
      });
    } catch {
      await ctx.reply(t(ctx, "bot.slotsFail"), { reply_markup: mainKeyboard(locale) });
    }
  }

  async function askConfirm(ctx) {
    ctx.session.step = "confirm";
    const locale = localeOf(ctx);
    const keyboard = new InlineKeyboard()
      .text(t(ctx, "bot.confirm"), "confirm")
      .text(t(ctx, "bot.restart"), "restart");
    let clinicLine = "";
    try {
      const payload = await fetchSlots(ctx.session.date, ctx.session.date);
      const slot =
        (payload.days?.[ctx.session.date] || []).find((item) => item.time === ctx.session.time) ||
        (payload.days?.[ctx.session.date] || [])[0];
      if (slot?.clinicName) {
        clinicLine = t(ctx, "bot.confirmClinic", {
          clinic: `${slot.clinicName}${slot.clinicAddress ? `, ${slot.clinicAddress}` : ""}`,
        });
      }
    } catch {
      clinicLine = "";
    }
    await ctx.reply(
      [
        t(ctx, "bot.confirmTitle"),
        t(ctx, "bot.confirmName", { name: ctx.session.name }),
        t(ctx, "bot.confirmPhone", { phone: formatLocalPhone(ctx.session.phone) }),
        t(ctx, "bot.confirmDate", { date: humanDate(ctx.session.date, locale), time: ctx.session.time }),
        clinicLine,
        t(ctx, "bot.confirmComment", { comment: ctx.session.comment || t(ctx, "bot.noComment") }),
      ]
        .filter(Boolean)
        .join("\n"),
      { reply_markup: keyboard }
    );
  }

  for (const locale of ["ru", "uz", "en"]) {
    bot.command(locale, async (ctx) => {
      if (isGroup(ctx)) {
        await saveGroupLocale(ctx, locale);
        return;
      }
      ctx.session.locale = locale;
      ctx.session.step = "idle";
      ctx.session.afterLang = "intro";
      try {
        await attachMiniAppMenu(ctx, locale);
      } catch (error) {
        console.error("Не удалось обновить кнопку «Запись»:", error);
      }
      await replyHome(ctx, t(ctx, introKey(ctx)), locale);
    });
  }

  bot.command("start", async (ctx) => {
    const payload = String(ctx.match || "").trim();
    const locale = isLocale(ctx.session.locale) ? ctx.session.locale : "";

    if (isGroup(ctx)) {
      ctx.session = { ...initialSession(), locale, step: "lang", afterLang: "intro" };
      await askLanguage(ctx, "intro");
      return;
    }

    try {
      await attachMiniAppMenu(ctx, locale || DEFAULT_LOCALE);
    } catch (error) {
      console.error("Не удалось повесить кнопку «Запись»:", error);
    }

    if (locale && payload === "book") {
      ctx.session = { ...initialSession(), locale, step: "idle", afterLang: "intro" };
      await ctx.reply(t(ctx, "bot.intro"), { reply_markup: mainKeyboard(locale) });
      return;
    }

    ctx.session = { ...initialSession(), locale, step: "lang", afterLang: "intro" };
    await askLanguage(ctx, "intro");
  });

  bot.on("my_chat_member", async (ctx) => {
    const next = ctx.myChatMember.new_chat_member.status;
    const prev = ctx.myChatMember.old_chat_member.status;
    const joined = next === "member" || next === "administrator";
    const wasOut = prev === "left" || prev === "kicked";
    if (!isGroup(ctx) || !joined || !wasOut) return;
    await welcomeGroup(ctx);
  });

  bot.hears(CHAT_LABELS, startChatBooking);

  bot.hears(["Записаться", "Отмена", "Пропустить", "Мои данные"], async (ctx) => {
    if (isGroup(ctx)) return;
    const locale = ctx.session.locale;
    ctx.session = { ...initialSession(), locale };
    await replyHome(ctx, t(ctx, menuHintKey(ctx)), locale);
  });

  bot.callbackQuery(/^lang:(ru|uz|en)$/, async (ctx) => {
    const locale = ctx.match[1];
    ctx.session.locale = locale;
    const afterLang = ctx.session.afterLang || "intro";
    await ctx.answerCallbackQuery();

    if (isGroup(ctx)) {
      await saveGroupLocale(ctx, locale);
      return;
    }

    try {
      await attachMiniAppMenu(ctx, locale);
    } catch (error) {
      console.error("Не удалось обновить кнопку «Запись»:", error);
    }
    if (afterLang === "name") {
      ctx.session.step = "name";
      await ctx.reply(t(ctx, "bot.askName"), { reply_markup: mainKeyboard(locale) });
      return;
    }
    ctx.session.step = "idle";
    ctx.session.afterLang = "intro";
    await replyHome(ctx, t(ctx, introKey(ctx)), locale);
  });

  bot.on("message:migrate_to_chat_id", async (ctx) => {
    const nextId = ctx.message?.migrate_to_chat_id;
    if (!nextId) return;
    try {
      await patchSettings({ telegramGroupId: String(nextId) });
    } catch (error) {
      console.error("Не удалось обновить мигрированный ID группы:", error);
    }
  });

  bot.on("message:contact", async (ctx) => {
    if (isGroup(ctx)) return;
    if (ctx.session.step !== "phone") return;
    const raw = ctx.message.contact.phone_number;
    if (!isValidPhone(raw)) {
      await ctx.reply(`${t(ctx, "bot.askPhone")}\n${t(ctx, "booking.phoneHint")}`, {
        reply_markup: new Keyboard().requestContact(t(ctx, "bot.sendPhone")).resized(),
      });
      return;
    }
    ctx.session.phone = localPhoneDigits(raw);
    await askDate(ctx);
  });

  bot.on("message:text", async (ctx) => {
    if (isGroup(ctx)) return;
    const text = ctx.message.text.trim();
    if (SKIP_TEXT.includes(text)) return;

    if (ctx.session.step === "lang") {
      await askLanguage(ctx, ctx.session.afterLang || "intro");
      return;
    }

    if (ctx.session.step === "name") {
      if (text.length < 2) {
        await ctx.reply(t(ctx, "bot.askName"), { reply_markup: mainKeyboard(localeOf(ctx)) });
        return;
      }
      ctx.session.name = text;
      ctx.session.step = "phone";
      await ctx.reply(t(ctx, "bot.askPhone"), {
        reply_markup: new Keyboard().requestContact(t(ctx, "bot.sendPhone")).resized(),
      });
      return;
    }

    if (ctx.session.step === "phone") {
      if (!isValidPhone(text)) {
        await ctx.reply(`${t(ctx, "bot.askPhone")}\n${t(ctx, "booking.phoneHint")}`, {
          reply_markup: new Keyboard().requestContact(t(ctx, "bot.sendPhone")).resized(),
        });
        return;
      }
      ctx.session.phone = localPhoneDigits(text);
      await askDate(ctx);
      return;
    }

    if (ctx.session.step === "comment") {
      ctx.session.comment = text;
      await askConfirm(ctx);
    }
  });

  bot.callbackQuery(/^date:(.+)$/, async (ctx) => {
    ctx.session.date = ctx.match[1];
    ctx.session.step = "time";
    await ctx.answerCallbackQuery();
    await askTime(ctx);
  });

  bot.callbackQuery(/^time:(.+)$/, async (ctx) => {
    ctx.session.time = ctx.match[1];
    ctx.session.comment = "";
    await ctx.answerCallbackQuery();
    await askConfirm(ctx);
  });

  bot.callbackQuery("confirm", async (ctx) => {
    await ctx.answerCallbackQuery();
    const locale = localeOf(ctx);
    try {
      const name = String(ctx.session.name || "").trim();
      const phone = normalizePhone(ctx.session.phone);
      const date = String(ctx.session.date || "");
      const time = String(ctx.session.time || "");
      const comment = String(ctx.session.comment || "").trim();

      if (!name || name.length < 2 || !phone || !date || !time) {
        await ctx.reply(t(ctx, "bot.bookFail"), { reply_markup: mainKeyboard(locale) });
        ctx.session = { ...initialSession(), locale };
        return;
      }

      if (!(await isSlotFree(date, time))) {
        await ctx.reply(t(ctx, "booking.slotTaken"), { reply_markup: mainKeyboard(locale) });
        await askDate(ctx);
        return;
      }

      const settings = await getSettings();
      const clinic = clinicForDate(date, settings);
      if (!clinic) {
        await ctx.reply(t(ctx, "bot.bookFail"), { reply_markup: mainKeyboard(locale) });
        ctx.session = { ...initialSession(), locale };
        return;
      }

      const telegramId = ctx.from?.id || null;
      const telegramUsername = normalizeTelegramUsername(ctx.from?.username || "");
      const client = await upsertClient({ name, phone, telegramId, telegramUsername });
      const appointment = await addAppointment({
        clientId: client.id,
        name,
        phone,
        date,
        time,
        comment,
        source: "bot",
        status: "pending",
        telegramId,
        telegramUsername,
        locale,
        ...clinicFields(clinic),
      });

      await notifyTelegramGroup(appointment);

      const doctorRaw = await getDoctor();
      const doctor = localizedDoctor(locale, { name: doctorRaw.name, title: doctorRaw.title });
      const sent = await ctx.reply(formatBookingCard(appointment, doctor, { locale }), {
        reply_markup: new InlineKeyboard().text(t(ctx, "bot.cancel"), `cancel:${appointment.id}`),
      });
      if (sent?.message_id) {
        await updateAppointment(appointment.id, { telegramPatientMessageId: sent.message_id });
      }
      await ctx.reply(t(ctx, "bot.menuHint"), { reply_markup: mainKeyboard(locale) });
      ctx.session = { ...initialSession(), locale };
    } catch (error) {
      console.error("Bot confirm booking failed:", error);
      await ctx.reply(t(ctx, "bot.siteDown"), {
        reply_markup: mainKeyboard(locale),
      });
    }
  });

  bot.callbackQuery(/^cancel:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const id = ctx.match[1];
    const locale = localeOf(ctx);
    try {
      const existing = await findAppointment(id);
      if (!existing) {
        await ctx.reply(t(ctx, "bot.cancelFail"), { reply_markup: mainKeyboard(locale) });
        return;
      }
      const doctorRaw = await getDoctor();
      const doctorCard = { name: doctorRaw.name, title: doctorRaw.title };
      let appointment = existing;
      if (existing.status !== "cancelled") {
        appointment = await updateAppointment(id, {
          status: "cancelled",
          cancelledAt: new Date().toISOString(),
        });
        await strikeGroupAppointment(appointment);
      }

      const cardLocale = normalizeLocale(appointment?.locale || locale);
      const doctor = localizedDoctor(cardLocale, doctorCard);
      const text = formatBookingCard(appointment, doctor, {
        cancelled: true,
        locale: cardLocale,
      });
      const freed = translate(cardLocale, "bot.slotFreed");
      try {
        await ctx.editMessageText(`${text}\n\n${freed}`, {
          reply_markup: { inline_keyboard: [] },
        });
      } catch {
        await ctx.reply(`${text}\n\n${freed}`);
      }
      await ctx.reply(t(ctx, "bot.bookAgain"), { reply_markup: mainKeyboard(locale) });
    } catch (error) {
      console.error("Bot cancel booking failed:", error);
      await ctx.reply(t(ctx, "bot.siteDown"), { reply_markup: mainKeyboard(locale) });
    }
  });

  bot.callbackQuery("restart", async (ctx) => {
    const locale = ctx.session.locale;
    ctx.session = { ...initialSession(), locale };
    await ctx.answerCallbackQuery();
    await ctx.reply(t(ctx, "bot.restartHint"), {
      reply_markup: mainKeyboard(locale),
    });
  });

  bot.catch((error) => {
    console.error("Bot error:", error);
  });

  return bot;
}

let cachedBot;

export function getBot() {
  if (!cachedBot) {
    cachedBot = createBot();
  }
  return cachedBot;
}

export function miniAppMenuButton(locale = DEFAULT_LOCALE) {
  const url = webAppUrl();
  return {
    type: "web_app",
    text: translate(normalizeLocale(locale), "bot.menu"),
    web_app: { url },
  };
}

export async function configureTelegram(bot = getBot()) {
  const groupCommands = [
    { command: "ru", description: "Русский" },
    { command: "uz", description: "O‘zbekcha" },
    { command: "en", description: "English" },
  ];
  let chatId = groupId();
  try {
    const settings = await getSettings();
    if (settings?.telegramGroupId) {
      chatId = String(settings.telegramGroupId);
    }
  } catch {
    // ignore
  }
  try {
    await bot.api.setMyCommands([{ command: "start", description: translate("ru", "bot.menu") }], {
      scope: { type: "all_private_chats" },
    });
    await bot.api.setMyCommands(groupCommands, { scope: { type: "all_group_chats" } });
    if (chatId) {
      try {
        await bot.api.setMyCommands(groupCommands, { scope: { type: "chat", chat_id: chatId } });
      } catch (chatError) {
        const migratedId = chatError?.parameters?.migrate_to_chat_id;
        if (migratedId) {
          await patchSettings({ telegramGroupId: String(migratedId) }).catch(() => {});
          await bot.api
            .setMyCommands(groupCommands, { scope: { type: "chat", chat_id: String(migratedId) } })
            .catch(() => {});
        }
      }
    }
  } catch (error) {
    console.error("Не удалось настроить команды группы:", error);
  }

  const url = webAppUrl();
  if (!url) {
    console.log("WEBAPP_URL не задан (нужен https://...) — Mini App в боте не откроется.");
    return { ok: false, reason: "WEBAPP_URL" };
  }
  try {
    await bot.api.setChatMenuButton({
      menu_button: miniAppMenuButton(DEFAULT_LOCALE),
    });
    console.log(`Mini App: ${url}`);
    return { ok: true, webAppUrl: url };
  } catch (error) {
    console.error("Не удалось повесить Mini App на кнопку меню:", error);
    return { ok: false, reason: "menu", error: String(error) };
  }
}

export function publicSiteUrl() {
  const explicitWebApp = String(process.env.WEBAPP_URL || "").trim();
  if (/^https:\/\//i.test(explicitWebApp) && !(process.env.VERCEL && isTunnelUrl(explicitWebApp))) {
    try {
      return new URL(explicitWebApp).origin;
    } catch {
      // ignore
    }
  }
  const explicitApi = String(process.env.API_URL || "").trim();
  if (/^https:\/\//i.test(explicitApi) && !(process.env.VERCEL && isTunnelUrl(explicitApi))) {
    return explicitApi.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "";
}

export function webhookSecret() {
  return process.env.TELEGRAM_WEBHOOK_SECRET || process.env.ADMIN_SECRET || "";
}

export async function setupTelegramWebhook(bot = getBot()) {
  const origin = publicSiteUrl();
  if (!origin) {
    throw new Error("Нет публичного HTTPS URL для webhook");
  }
  const secret = webhookSecret();
  await bot.api.setWebhook(`${origin}/api/telegram/webhook`, {
    secret_token: secret || undefined,
    allowed_updates: ["message", "callback_query", "my_chat_member"],
    drop_pending_updates: false,
  });
  const configured = await configureTelegram(bot);
  return { origin, webhook: `${origin}/api/telegram/webhook`, ...configured };
}
