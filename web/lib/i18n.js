import ru from "../../data/i18n/ru.json";
import uz from "../../data/i18n/uz.json";
import en from "../../data/i18n/en.json";
import { createTranslate } from "../../shared/i18n.js";

export { LOCALES, DEFAULT_LOCALE, INTL_LOCALE, isLocale, normalizeLocale } from "../../shared/i18n.js";

export const STORAGE_KEY = "medora-lang";
export const MESSAGES = { ru, uz, en };
export const translate = createTranslate(MESSAGES);
