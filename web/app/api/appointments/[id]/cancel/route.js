import { findAppointment, getDoctor, updateAppointment } from "@/lib/store";
import { strikeGroupAppointment, strikePatientBookingCard } from "@/lib/telegram";

export const dynamic = "force-dynamic";

function publicAppointment(item) {
  if (!item) return null;
  return {
    id: item.id,
    date: item.date,
    time: item.time,
    clinicId: item.clinicId,
    clinicName: item.clinicName,
    clinicAddress: item.clinicAddress,
    status: item.status,
    cancelledAt: item.cancelledAt,
    locale: item.locale,
  };
}

export async function POST(_request, { params }) {
  const { id } = await params;
  const appointment = await findAppointment(id);
  if (!appointment) {
    return Response.json({ error: "Заявка не найдена" }, { status: 404 });
  }
  const doctor = await getDoctor();
  const payload = { name: doctor.name, title: doctor.title };
  if (appointment.status === "cancelled") {
    return Response.json({ appointment: publicAppointment(appointment), already: true, doctor: payload });
  }

  const updated = await updateAppointment(id, {
    status: "cancelled",
    cancelledAt: new Date().toISOString(),
  });
  await strikeGroupAppointment(updated);
  await strikePatientBookingCard(updated, payload);
  return Response.json({ appointment: publicAppointment(updated), doctor: payload });
}
