import { addDaysISO, formatDateISO, getSlotsRange } from "@/lib/slots";
import { getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const settings = await getSettings();
  const today = formatDateISO(new Date(), settings.timezone);
  const from = searchParams.get("from") || today;
  const to = searchParams.get("to") || addDaysISO(from, settings.bookingHorizonDays);
  const date = searchParams.get("date");

  if (date) {
    const { days } = await getSlotsRange(date, date);
    return Response.json({ date, slots: days[date] || [], settings });
  }

  const payload = await getSlotsRange(from, to);
  return Response.json({ from, to, ...payload });
}
