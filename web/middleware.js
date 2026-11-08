import { NextResponse } from "next/server";
import { ADMIN_COOKIE, isAdminSession } from "./lib/auth";

function isAuthorized(token) {
  if (isAdminSession(token)) return true;
  return Boolean(process.env.CRON_SECRET) && token === process.env.CRON_SECRET;
}

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const isAdminPage = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isPublicBooking = pathname === "/api/appointments" && request.method === "POST";
  const isPublicCancel = request.method === "POST" && /^\/api\/appointments\/[^/]+\/cancel$/.test(pathname);
  const isPublicReviews = pathname === "/api/reviews";
  const isAdminApi =
    (pathname.startsWith("/api/appointments") && !isPublicBooking && !isPublicCancel) ||
    pathname.startsWith("/api/clients") ||
    pathname.startsWith("/api/admin/stats") ||
    pathname.startsWith("/api/reminders");

  if (isPublicReviews) {
    return NextResponse.next();
  }

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  const cookieToken = request.cookies.get(ADMIN_COOKIE)?.value;
  const headerToken = request.headers.get("x-medora-secret");
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";

  if (!isAuthorized(cookieToken) && !isAuthorized(headerToken) && !isAuthorized(bearer)) {
    if (isAdminApi) {
      return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/appointments",
    "/api/appointments/:path*",
    "/api/clients",
    "/api/admin/stats",
    "/api/reminders/:path*",
    "/api/reviews",
  ],
};
