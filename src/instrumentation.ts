export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startReminders } = await import("./lib/reminders");
  startReminders();
}
