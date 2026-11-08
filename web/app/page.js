import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { About } from "@/components/About";
import { Booking } from "@/components/Booking";
import { Reviews } from "@/components/Reviews";
import { Footer } from "@/components/Footer";
import { getDoctor, getReviews, getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const doctor = await getDoctor();
  const reviews = await getReviews();
  const settings = await getSettings();
  const now = new Date();

  return (
    <div>
      <Header phone={doctor.contacts.phone} />
      <main>
        <Hero doctor={doctor} slotMinutes={settings.slotMinutes} />
        <Features />
        <About />
        <Booking initialYear={now.getFullYear()} initialMonth={now.getMonth()} />
        <Reviews reviews={reviews} />
      </main>
      <Footer doctor={doctor} />
    </div>
  );
}
