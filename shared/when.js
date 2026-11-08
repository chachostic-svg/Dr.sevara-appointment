export function wallTimeToUtcMs(dateISO, time, timeZone = "Europe/Moscow") {
  const [year, month, day] = dateISO.split("-").map(Number);
  const [hour, minute] = String(time || "00:00").split(":").map(Number);
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(asIfUtc))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  const shownAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asIfUtc - (shownAsUtc - asIfUtc);
}
