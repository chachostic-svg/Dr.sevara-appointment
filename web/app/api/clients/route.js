import { compareAppointmentsDesc } from "@/lib/slots";
import { getAppointments, getClients } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const appointments = await getAppointments();
  const clients = (await getClients()).map((client) => {
    const visits = appointments
      .filter((item) => item.clientId === client.id || item.phone === client.phone)
      .sort(compareAppointmentsDesc);
    return {
      ...client,
      visits,
      lastVisit: visits[0] || null,
    };
  });

  return Response.json({ clients });
}
