export function isLocalMiniPreviewRequest(request) {
  if (process.env.NODE_ENV !== "development") return false;
  const host = request.headers.get("host") || "";
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
}
