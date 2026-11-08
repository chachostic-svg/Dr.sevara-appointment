import { processDueReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";

async function tick() {
  const result = await processDueReminders();
  return Response.json(result);
}

export async function GET() {
  return tick();
}

export async function POST() {
  return tick();
}
