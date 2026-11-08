import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sharedDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(sharedDir, "..");

let sqlClient;
let schemaReady = false;
let queue = Promise.resolve();

export function getDataDir() {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;

  const candidates = [
    path.join(repoRoot, "data"),
    path.join(process.cwd(), "data"),
    path.join(process.cwd(), "..", "data"),
  ];

  return candidates.find((dir) => fs.existsSync(dir)) || candidates[0];
}

function filePath(name) {
  return path.join(getDataDir(), name);
}

function readJson(name) {
  return JSON.parse(fs.readFileSync(filePath(name), "utf8"));
}

function writeJson(name, data) {
  fs.writeFileSync(filePath(name), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function useDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

async function db() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL не задан");
  }
  if (!sqlClient) {
    const { neon } = await import("@neondatabase/serverless");
    sqlClient = neon(process.env.DATABASE_URL);
  }
  return sqlClient;
}

function jsonParam(value) {
  return JSON.stringify(value);
}

async function ensureSchema() {
  if (!useDatabase() || schemaReady) return;
  const sql = await db();
  await sql`CREATE TABLE IF NOT EXISTS settings (
    id SMALLINT PRIMARY KEY DEFAULT 1,
    data JSONB NOT NULL
  )`;
  await sql`CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    payload JSONB NOT NULL
  )`;
  await sql`CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    payload JSONB NOT NULL
  )`;
  await sql`CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    payload JSONB NOT NULL
  )`;
  await sql`CREATE TABLE IF NOT EXISTS bot_sessions (
    key TEXT PRIMARY KEY,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  const existing = await sql`SELECT 1 FROM settings WHERE id = 1`;
  if (!existing.length) {
    await sql`INSERT INTO settings (id, data) VALUES (1, ${jsonParam(readJson("settings.json"))}::jsonb)`;
  }
  schemaReady = true;
}

function withLock(fn) {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getDoctor() {
  return readJson("doctor.json");
}

export async function getSettings() {
  if (!useDatabase()) return readJson("settings.json");
  await ensureSchema();
  const sql = await db();
  const rows = await sql`SELECT data FROM settings WHERE id = 1`;
  return rows[0]?.data || readJson("settings.json");
}

export async function patchSettings(partial) {
  if (!useDatabase()) {
    return withLock(async () => {
      const settings = { ...(await getSettings()), ...partial };
      writeJson("settings.json", settings);
      return settings;
    });
  }
  await ensureSchema();
  const sql = await db();
  const settings = { ...(await getSettings()), ...partial };
  await sql`INSERT INTO settings (id, data) VALUES (1, ${jsonParam(settings)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`;
  return settings;
}

export async function getReviews() {
  if (!useDatabase()) return readJson("reviews.json");
  await ensureSchema();
  const sql = await db();
  const rows = await sql`SELECT payload FROM reviews ORDER BY payload->>'date' DESC, id DESC`;
  return rows.map((row) => row.payload);
}

export async function saveReviews(reviews) {
  if (!useDatabase()) {
    writeJson("reviews.json", reviews);
    return reviews;
  }
  await ensureSchema();
  const sql = await db();
  await sql`DELETE FROM reviews`;
  for (const review of reviews) {
    await sql`INSERT INTO reviews (id, payload) VALUES (${review.id}, ${jsonParam(review)}::jsonb)`;
  }
  return reviews;
}

export async function addReview(payload) {
  const review = {
    id: createId("rev"),
    name: payload.name,
    text: payload.text,
    rating: payload.rating,
    date: new Date().toISOString().slice(0, 10),
    locale: payload.locale || "",
  };
  if (!useDatabase()) {
    return withLock(async () => {
      const reviews = await getReviews();
      reviews.unshift(review);
      await saveReviews(reviews);
      return review;
    });
  }
  await ensureSchema();
  const sql = await db();
  await sql`INSERT INTO reviews (id, payload) VALUES (${review.id}, ${jsonParam(review)}::jsonb)`;
  return review;
}

export async function getAppointments() {
  if (!useDatabase()) return readJson("appointments.json");
  await ensureSchema();
  const sql = await db();
  const rows = await sql`SELECT payload FROM appointments`;
  return rows.map((row) => row.payload);
}

export async function getClients() {
  if (!useDatabase()) return readJson("clients.json");
  await ensureSchema();
  const sql = await db();
  const rows = await sql`SELECT payload FROM clients`;
  return rows.map((row) => row.payload);
}

export async function saveAppointments(appointments) {
  if (!useDatabase()) {
    writeJson("appointments.json", appointments);
    return appointments;
  }
  await ensureSchema();
  const sql = await db();
  await sql`DELETE FROM appointments`;
  for (const appointment of appointments) {
    await sql`INSERT INTO appointments (id, payload) VALUES (${appointment.id}, ${jsonParam(appointment)}::jsonb)`;
  }
  return appointments;
}

export async function saveClients(clients) {
  if (!useDatabase()) {
    writeJson("clients.json", clients);
    return clients;
  }
  await ensureSchema();
  const sql = await db();
  await sql`DELETE FROM clients`;
  for (const client of clients) {
    await sql`INSERT INTO clients (id, payload) VALUES (${client.id}, ${jsonParam(client)}::jsonb)`;
  }
  return clients;
}

export async function upsertClient({ name, phone, telegramId = null, telegramUsername = "" }) {
  if (!useDatabase()) {
    return withLock(async () => {
      const clients = await getClients();
      const existing = clients.find((client) => client.phone === phone);
      if (existing) {
        existing.name = name || existing.name;
        if (telegramId) existing.telegramId = telegramId;
        if (telegramUsername) existing.telegramUsername = telegramUsername;
        await saveClients(clients);
        return existing;
      }
      const client = {
        id: createId("cli"),
        name,
        phone,
        telegramId,
        telegramUsername: telegramUsername || "",
        createdAt: new Date().toISOString(),
      };
      clients.push(client);
      await saveClients(clients);
      return client;
    });
  }

  await ensureSchema();
  const sql = await db();
  const rows = await sql`SELECT payload FROM clients WHERE payload->>'phone' = ${phone} LIMIT 1`;
  if (rows[0]?.payload) {
    const existing = rows[0].payload;
    existing.name = name || existing.name;
    if (telegramId) existing.telegramId = telegramId;
    if (telegramUsername) existing.telegramUsername = telegramUsername;
    await sql`UPDATE clients SET payload = ${jsonParam(existing)}::jsonb WHERE id = ${existing.id}`;
    return existing;
  }

  const client = {
    id: createId("cli"),
    name,
    phone,
    telegramId,
    telegramUsername: telegramUsername || "",
    createdAt: new Date().toISOString(),
  };
  await sql`INSERT INTO clients (id, payload) VALUES (${client.id}, ${jsonParam(client)}::jsonb)`;
  return client;
}

export async function addAppointment(payload) {
  const appointment = {
    id: createId("apt"),
    createdAt: new Date().toISOString(),
    status: "pending",
    comment: "",
    ...payload,
  };
  if (!useDatabase()) {
    return withLock(async () => {
      const appointments = await getAppointments();
      appointments.push(appointment);
      await saveAppointments(appointments);
      return appointment;
    });
  }
  await ensureSchema();
  const sql = await db();
  await sql`INSERT INTO appointments (id, payload) VALUES (${appointment.id}, ${jsonParam(appointment)}::jsonb)`;
  return appointment;
}

export async function updateAppointment(id, patch) {
  if (!useDatabase()) {
    return withLock(async () => {
      const appointments = await getAppointments();
      const index = appointments.findIndex((item) => item.id === id);
      if (index === -1) return null;
      appointments[index] = { ...appointments[index], ...patch };
      await saveAppointments(appointments);
      return appointments[index];
    });
  }
  await ensureSchema();
  const sql = await db();
  const rows = await sql`SELECT payload FROM appointments WHERE id = ${id}`;
  if (!rows[0]?.payload) return null;
  const updated = { ...rows[0].payload, ...patch };
  await sql`UPDATE appointments SET payload = ${jsonParam(updated)}::jsonb WHERE id = ${id}`;
  return updated;
}

export async function findAppointment(id) {
  if (!useDatabase()) {
    return (await getAppointments()).find((item) => item.id === id) || null;
  }
  await ensureSchema();
  const sql = await db();
  const rows = await sql`SELECT payload FROM appointments WHERE id = ${id}`;
  return rows[0]?.payload || null;
}

export async function readBotSession(key) {
  if (!useDatabase()) return undefined;
  await ensureSchema();
  const sql = await db();
  const rows = await sql`SELECT payload FROM bot_sessions WHERE key = ${key}`;
  return rows[0]?.payload;
}

export async function writeBotSession(key, value) {
  if (!useDatabase()) return;
  await ensureSchema();
  const sql = await db();
  await sql`INSERT INTO bot_sessions (key, payload, updated_at)
    VALUES (${key}, ${jsonParam(value)}::jsonb, NOW())
    ON CONFLICT (key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`;
}

export async function deleteBotSession(key) {
  if (!useDatabase()) return;
  await ensureSchema();
  const sql = await db();
  await sql`DELETE FROM bot_sessions WHERE key = ${key}`;
}
