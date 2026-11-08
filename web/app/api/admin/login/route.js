import { cookies } from "next/headers";
import { ADMIN_COOKIE, getAdminPassword, getSessionSecret } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const body = await request.json();
  const password = String(body.password || "");

  if (password !== getAdminPassword()) {
    return Response.json({ error: "invalid" }, { status: 401 });
  }

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, getSessionSecret(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return Response.json({ ok: true });
}
