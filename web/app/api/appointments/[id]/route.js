import { findAppointment, getDoctor, updateAppointment } from "@/lib/store";
import { strikeGroupAppointment, strikePatientBookingCard } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const appointment = await findAppointment(id);
  if (!appointment) {
    return Response.json({ error: "Заявка не найдена" }, { status: 404 });
  }

  const body = await request.json();
  const status = body.status;
  if (!["pending", "confirmed", "cancelled"].includes(status)) {
    return Response.json({ error: "Некорректный статус" }, { status: 400 });
  }

  const updated = await updateAppointment(id, {
    status,
    cancelledAt: status === "cancelled" ? new Date().toISOString() : appointment.cancelledAt,
  });
  if (status === "cancelled" && appointment.status !== "cancelled") {
    const doctor = await getDoctor();
    await strikeGroupAppointment(updated);
    await strikePatientBookingCard(updated, { name: doctor.name, title: doctor.title });
  }
  return Response.json({ appointment: updated });
}
