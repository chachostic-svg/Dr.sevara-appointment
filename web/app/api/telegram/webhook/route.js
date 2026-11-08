import { webhookCallback } from "grammy";
import { getBot, webhookSecret } from "../../../../../bot/create-bot.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function handler() {
  const secret = webhookSecret();
  return webhookCallback(getBot(), "std/http", secret ? { secretToken: secret } : {});
}

export async function POST(request) {
  if (!process.env.BOT_TOKEN) {
    return new Response("BOT_TOKEN is not set", { status: 503 });
  }
  try {
    return await handler()(request);
  } catch (error) {
    console.error("Telegram webhook:", error);
    return new Response("ok", { status: 200 });
  }
}
