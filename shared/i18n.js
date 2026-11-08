export const LOCALES = ["ru", "uz", "en"];
export const DEFAULT_LOCALE = "ru";
export const INTL_LOCALE = { ru: "ru-RU", uz: "uz-UZ", en: "en-US" };

export function isLocale(value) {
  return LOCALES.includes(value);
}

export function normalizeLocale(value) {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function getByPath(source, path) {
  return path.split(".").reduce((current, key) => current?.[key], source);
}

export function interpolate(template, vars = {}) {
  return String(template ?? "").replace(/\{(\w+)\}/g, (_, key) => (vars[key] == null ? "" : String(vars[key])));
}

export function createTranslate(messages, fallback = DEFAULT_LOCALE) {
  return function translate(locale, path, vars) {
    const pack = messages[normalizeLocale(locale)] || messages[fallback];
    const value = getByPath(pack, path);
    if (typeof value === "string") return interpolate(value, vars);
    if (value != null) return value;
    const fallbackValue = getByPath(messages[fallback], path);
    if (typeof fallbackValue === "string") return interpolate(fallbackValue, vars);
    return fallbackValue ?? path;
  };
}
