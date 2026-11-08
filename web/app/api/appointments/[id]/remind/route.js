import { findAppointment, getClients, getDoctor, getSettings } from "@/lib/store";
import { appointmentStartMs, hasReminderContact, sendAppointmentReminder } from "@/lib/reminders";
import { isActiveStatus } from "@/lib/slots";

export const dynamic = "force-dynamic";

export async function POST(_request, { params }) {
  const { id } = await params;
  const appointment = await findAppointment(id);
  if (!appointment) {
    return Response.json({ error: "Заявка не найдена" }, { status: 404 });
  }
  if (!isActiveStatus(appointment.status)) {
    return Response.json({ error: "Напоминание можно отправить только по активной записи" }, { status: 400 });
  }
  const clients = await getClients();
  if (!hasReminderContact(appointment, clients)) {
    return Response.json({ error: "Telegram не указан — напоминание не отправляем." }, { status: 400 });
  }

  const settings = await getSettings();
  const start = appointmentStartMs(appointment, settings.timezone);
  if (Date.now() >= start) {
    return Response.json({ error: "Время приёма уже прошло" }, { status: 400 });
  }

  const result = await sendAppointmentReminder(appointment, "manual", {
    doctor: await getDoctor(),
    clients,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 409 });
  }

  return Response.json({ appointment: result.appointment });
}
