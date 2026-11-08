import { MiniApp } from "@/components/mini/MiniApp";
import { getDoctor } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function MiniPage() {
  const doctor = await getDoctor();
  const now = new Date();
  return (
    <MiniApp
      doctor={doctor}
      localPreview={process.env.NODE_ENV === "development"}
      initialYear={now.getFullYear()}
      initialMonth={now.getMonth()}
    />
  );
}
