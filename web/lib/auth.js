export const ADMIN_COOKIE = "medora_admin";

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "adminsevara";
}

export function getSessionSecret() {
  return process.env.ADMIN_SECRET || "medora-admin-session";
}

export function isAdminSession(token) {
  return Boolean(token) && token === getSessionSecret();
}
