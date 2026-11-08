export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.VERCEL) return;

  const { processDueReminders } = await import("../shared/reminders.js");

  const tick = () => {
    processDueReminders().catch((error) => {
      console.error("Reminders tick failed:", error);
    });
  };

  setTimeout(tick, 5_000);
  setInterval(tick, 60_000);
}
