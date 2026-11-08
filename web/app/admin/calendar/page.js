"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { fetchJson } from "@/lib/api";
import { toISO } from "@/lib/booking-calendar";
import { formatHumanDate } from "@/lib/date";
import { ADMIN_CARD_CLASS } from "@/lib/ui";
import { useJson } from "@/lib/use-json";
import { Magnetic } from "@/components/Magnetic";
import { useI18n } from "@/components/LocaleProvider";

function visitLabel(count, t, locale) {
  const n = Number(count) || 0;
  if (locale === "en") {
    return t(n === 1 ? "admin.visitOne" : "admin.visitMany", { count: n });
  }
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return t("admin.visitOne", { count: n });
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return t("admin.visitFew", { count: n });
  return t("admin.visitMany", { count: n });
}

function sourceText(source, t) {
  if (source === "mini") return t("admin.sourceMini");
  if (source === "bot") return t("admin.sourceBot");
  return t("admin.sourceWeb");
}

function dateWindow(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
  return Array.from({ length: 10 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return toISO(day);
  });
}

function matchesClientQuery(item, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = `${item.name || ""} ${item.phone || ""} ${item.telegramUsername || ""} @${item.telegramUsername || ""}`.toLowerCase();
  if (haystack.includes(q)) return true;
  const digits = q.replace(/\D/g, "");
  const phoneDigits = String(item.phone || "").replace(/\D/g, "");
  return digits.length >= 3 && phoneDigits.includes(digits);
}

export default function AdminCalendarPage() {
  const { t, locale } = useI18n();
  const { data, load } = useJson("/api/appointments");
  const { data: clientsData } = useJson("/api/clients");
  const appointments = data?.appointments || [];
  const clients = clientsData?.clients || [];
  const [selected, setSelected] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState({});
  const searching = Boolean(query.trim());

  const matchedAppointments = useMemo(
    () => appointments.filter((item) => matchesClientQuery(item, query)),
    [appointments, query]
  );

  const matchedClients = useMemo(
    () => clients.filter((client) => matchesClientQuery(client, query)),
    [clients, query]
  );

  const dates = useMemo(() => dateWindow(), []);
  const today = dates[2];

  useEffect(() => {
    if (searching) return;
    if (!selected || !dates.includes(selected)) setSelected(today);
  }, [dates, searching, selected, today]);

  const visible = matchedAppointments.filter((item) => {
    const sameDay = searching || !selected || item.date === selected;
    const sameStatus = filter === "all" || item.status === filter;
    return sameDay && sameStatus;
  });

  async function sendReminder(id) {
    setNotice((current) => ({ ...current, [id]: "sending" }));
    const { ok, data: payload } = await fetchJson(`/api/appointments/${id}/remind`, { method: "POST" });
    setNotice((current) => ({
      ...current,
      [id]: ok ? "sent" : payload.error || t("admin.remindFail"),
    }));
    await load();
  }

  return (
    <div>
      <AdminHeader eyebrow={t("admin.schedule")} title={t("admin.calendar")} />
      <p className="mt-3 max-w-2xl text-sm text-muted">{t("admin.lead")}</p>
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          if (event.target.value.trim()) setSelected("");
        }}
        placeholder={t("admin.search")}
        className="mt-6 w-full max-w-md rounded-xl border border-line bg-bg-elev px-4 py-2"
      />
      {searching && (
        <div className="mt-4 space-y-2">
          {matchedClients.length === 0 && (
            <p className="text-sm text-muted">{t("admin.noClients")}</p>
          )}
          {matchedClients.map((client) => (
            <Magnetic key={client.id} className="block" strength={10} scale={1.03}>
            <article className={`${ADMIN_CARD_CLASS} px-4 py-3`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <div className="font-medium">{client.name}</div>
                  <div className="text-sm text-muted">{client.phone}</div>
                </div>
                <div className="text-sm text-muted">{visitLabel(client.visits.length, t, locale)}</div>
              </div>
            </article>
            </Magnetic>
          ))}
        </div>
      )}
      {!searching && (
        <div className="mt-6 flex flex-wrap gap-2">
          {dates.map((date) => (
            <Magnetic key={date} strength={8}>
              <button
                type="button"
                onClick={() => setSelected(date)}
                className={`rounded-xl px-4 py-2 text-sm ${
                  selected === date ? "bg-brand text-white dark:text-ink" : "border border-line"
                }`}
              >
                {date}
              </button>
            </Magnetic>
          ))}
        </div>
      )}
      <div className="mt-4 flex gap-2 text-sm">
        {[
          ["all", t("admin.all")],
          ["cancelled", t("admin.cancelledFilter")],
        ].map(([value, label]) => (
          <Magnetic key={value} strength={8}>
            <button
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-xl border px-3 py-1 ${filter === value ? "border-brand bg-brand-soft" : "border-line text-muted"}`}
            >
              {label}
            </button>
          </Magnetic>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {searching ? (
          <h2 className="font-semibold text-2xl">{t("admin.clientAppointments")}</h2>
        ) : selected ? (
          <h2 className="font-semibold text-2xl capitalize">{formatHumanDate(selected, "long", locale)}</h2>
        ) : null}
        {visible.length === 0 && (
          <p className="text-muted">{searching ? t("admin.emptySearch") : t("admin.emptyDay")}</p>
        )}
        {visible
          .slice()
          .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
          .map((item) => (
            <Magnetic key={item.id} className="block" strength={10} scale={1.03}>
            <article className={`${ADMIN_CARD_CLASS} p-5 ${item.status === "cancelled" ? "opacity-80" : ""}`}>
              <div className={`flex flex-wrap items-start justify-between gap-3 ${item.status === "cancelled" ? "line-through" : ""}`}>
                <div>
                  <div className="font-semibold text-2xl">
                    {searching ? `${item.date} · ${item.time}` : item.time}
                  </div>
                  <div className="mt-1 font-medium">{item.name}</div>
                  <div className="text-sm text-muted">{item.phone}</div>
                  {item.clinicName ? (
                    <div className="mt-1 text-sm text-muted">
                      {item.clinicName}
                      {item.clinicAddress ? `, ${item.clinicAddress}` : ""}
                    </div>
                  ) : null}
                  {item.comment && <p className="mt-2 text-sm text-muted">{item.comment}</p>}
                </div>
                <div className="text-right text-sm">
                  <div>{sourceText(item.source, t)}</div>
                  {item.status === "cancelled" ? <div className="mt-1">{t("admin.cancelled")}</div> : null}
                  {item.telegramUsername ? (
                    <div className="mt-1 text-muted">@{item.telegramUsername}</div>
                  ) : null}
                </div>
              </div>
              {item.status !== "cancelled" && item.canRemind && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Magnetic strength={8}>
                    <button
                      type="button"
                      disabled={notice[item.id] === "sending"}
                      onClick={() => sendReminder(item.id)}
                      className="rounded-xl border border-line px-4 py-2 text-sm"
                    >
                      {notice[item.id] === "sending" ? t("admin.reminding") : t("admin.remind")}
                    </button>
                  </Magnetic>
                </div>
              )}
              {notice[item.id] && notice[item.id] !== "sending" && (
                <p className={`mt-3 text-sm ${notice[item.id] === "sent" ? "text-ok" : "text-danger"}`}>
                  {notice[item.id] === "sent" ? t("admin.reminded") : notice[item.id]}
                </p>
              )}
            </article>
            </Magnetic>
          ))}
      </div>
    </div>
  );
}
