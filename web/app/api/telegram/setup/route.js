import { getBot, setupTelegramWebhook } from "../../../../../bot/create-bot.js";
import { ADMIN_COOKIE, isAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request) {
  const cookieToken = request.cookies.get(ADMIN_COOKIE)?.value;
  const headerToken = request.headers.get("x-medora-secret");
  const auth = request.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return isAdminSession(cookieToken) || isAdminSession(headerToken) || isAdminSession(bearer);
}

async function handleSetup(request) {
  if (!authorized(request)) {
    return Response.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  if (!process.env.BOT_TOKEN) {
    return Response.json({ error: "BOT_TOKEN не задан" }, { status: 503 });
  }
  try {
    const result = await setupTelegramWebhook(getBot());
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("Telegram setup:", error);
    return Response.json({ error: error.message || "setup failed" }, { status: 500 });
  }
}

export async function GET(request) {
  return handleSetup(request);
}

export async function POST(request) {
  return handleSetup(request);
}
