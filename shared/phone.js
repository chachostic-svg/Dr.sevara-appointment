export const COUNTRY_CODE = "998";
export const COUNTRY_PREFIX = "+998";

export function digitsOnly(input) {
  return String(input || "").replace(/\D/g, "");
}

export function localPhoneDigits(input) {
  let digits = digitsOnly(input);
  if (digits.startsWith(COUNTRY_CODE)) {
    digits = digits.slice(COUNTRY_CODE.length);
  }
  return digits.slice(0, 9);
}

export function formatLocalPhone(input) {
  const digits = localPhoneDigits(input);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
}

export function normalizePhone(input) {
  const local = localPhoneDigits(input);
  if (local.length !== 9) return "";
  return `${COUNTRY_PREFIX} ${local.slice(0, 2)} ${local.slice(2, 5)}-${local.slice(5, 7)}-${local.slice(7, 9)}`;
}

export function isValidPhone(input) {
  return Boolean(normalizePhone(input));
}

export function telHref(phone) {
  return `tel:${String(phone || "").replace(/[^\d+]/g, "")}`;
}
