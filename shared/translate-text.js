import { normalizeLocale } from "./i18n.js";

function guessSourceLocale(text, fallback = "ru") {
  if (/[А-Яа-яЁё]/.test(text || "")) return "ru";
  return normalizeLocale(fallback);
}

function decodeEntities(value) {
  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replaceAll("&apos;", "‘")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

export async function translateText(text, fromLocale, toLocale) {
  const source = String(text || "").trim();
  const from = normalizeLocale(fromLocale);
  const to = normalizeLocale(toLocale);
  if (!source || from === to) return source;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(source.slice(0, 500))}&langpair=${from}|${to}`;
    const response = await fetch(url, { signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    const translated = data?.responseData?.translatedText;
    if (typeof translated !== "string") return source;
    const clean = translated.trim();
    if (!clean || /MYMEMORY WARNING/i.test(clean)) return source;
    return decodeEntities(clean);
  } catch (error) {
    console.error("Comment translate failed:", error);
    return source;
  } finally {
    clearTimeout(timer);
  }
}

export async function translateCommentForGroup(appointment, groupLocale) {
  const comment = String(appointment?.comment || "").trim();
  if (!comment) return "";
  const from = appointment.locale
    ? normalizeLocale(appointment.locale)
    : guessSourceLocale(comment, "ru");
  return translateText(comment, from, groupLocale);
}
