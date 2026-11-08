import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { configureTelegram, getBot } from "./create-bot.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, "web", ".env.local") });

const token = process.env.BOT_TOKEN;
if (!token) {
  console.log("BOT_TOKEN не задан — Telegram-бот не запускается. Сайт и админка работают без него.");
  await new Promise(() => {});
}

const bot = getBot();

bot.start({
  allowed_updates: ["message", "callback_query", "my_chat_member"],
  onStart: async (info) => {
    console.log(`Dr. Sevara bot @${info.username} запущен`);
    await configureTelegram(bot);
  },
});

if (!process.env.VERCEL) {
  const reminderSecret = process.env.ADMIN_SECRET || "medora-admin-session";
  const apiUrl = process.env.API_URL || "http://localhost:3000";

  async function tickReminders() {
    try {
      await fetch(`${apiUrl}/api/reminders/tick`, {
        method: "POST",
        headers: { "x-medora-secret": reminderSecret },
      });
    } catch {
      // сайт ещё не поднялся
    }
  }

  setTimeout(tickReminders, 8_000);
  setInterval(tickReminders, 60_000);
}
