"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchJson } from "@/lib/api";
import { buildMonthCells, monthLabel, toISO } from "@/lib/booking-calendar";
import { useI18n } from "./LocaleProvider";
import { COUNTRY_PREFIX, formatLocalPhone, normalizePhone } from "@/lib/phone";
import { PANEL_CLASS, PRIMARY_BTN_CLASS } from "@/lib/ui";
import { Magnetic } from "./Magnetic";
import { MagneticCard } from "./MagneticCard";
import { PageSection } from "./PageSection";
import { Reveal } from "./Reveal";
import { SectionHeader } from "./SectionHeader";
import { BookingReceipt } from "./BookingReceipt";

export function Booking({ initialYear, initialMonth }) {
  const { t, locale } = useI18n();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [days, setDays] = useState({});
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [booked, setBooked] = useState(null);
  const [cancelled, setCancelled] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const from = toISO(new Date(year, month, 1));
  const to = toISO(new Date(year, month + 1, 0));
  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);
  const slots = days[selectedDate] || [];
  const availableSlots = slots.filter((slot) => slot.available);
  const selectedClinic = slots.find((slot) => slot.clinicName) || availableSlots[0];

  useEffect(() => {
    let ignore = false;
    async function load() {
      const { data } = await fetchJson(`/api/slots?from=${from}&to=${to}`);
      if (!ignore) setDays(data.days || {});
    }
    load();
    return () => {
      ignore = true;
    };
  }, [from, to, status]);

  function shiftMonth(delta) {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
    setSelectedDate("");
    setSelectedTime("");
  }

  async function submit(event) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    const { ok, data } = await fetchJson("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone: normalizePhone(phone),
        date: selectedDate,
        time: selectedTime,
        comment,
        source: "web",
        locale,
      }),
    });
    if (!ok) {
      setStatus("error");
      setMessage(data.error || t("booking.fail"));
      return;
    }
    setStatus("success");
    setBooked({ appointment: data.appointment, doctor: data.doctor });
    setCancelled(false);
    setMessage("");
    setName("");
    setPhone("");
    setComment("");
    setSelectedDate("");
    setSelectedTime("");
  }

  async function cancelBooking() {
    if (!booked?.appointment?.id) return;
    setCanceling(true);
    const { ok, data } = await fetchJson(`/api/appointments/${booked.appointment.id}/cancel`, {
      method: "POST",
    });
    setCanceling(false);
    if (!ok) {
      setMessage(data.error || t("booking.cancelFail"));
      return;
    }
    setCancelled(true);
    setStatus("idle");
  }

  return (
    <PageSection id="booking" band bandClass="bg-navy text-white">
      <Reveal>
        <SectionHeader tone="dark" eyebrow={t("booking.eyebrow")} title={t("booking.title")}>
          <p className="mt-3 max-w-2xl text-sm text-sky/85 sm:text-base">{t("booking.lead")}</p>
        </SectionHeader>
      </Reveal>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <MagneticCard strength={8} scale={1.02} className="h-full">
          <div className={`${PANEL_CLASS} p-4 text-ink sm:p-6`}>
            <div className="flex items-center justify-between gap-2">
              <Magnetic strength={10}>
                <button type="button" className="rounded-xl border border-line px-3 py-1 text-navy" onClick={() => shiftMonth(-1)}>
                  ←
                </button>
              </Magnetic>
              <h3 className="text-lg font-semibold text-navy sm:text-2xl">{monthLabel(year, month, locale)}</h3>
              <Magnetic strength={10}>
                <button type="button" className="rounded-xl border border-line px-3 py-1 text-navy" onClick={() => shiftMonth(1)}>
                  →
                </button>
              </Magnetic>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] text-muted sm:text-xs">
              {(t("weekdays") || []).map((day) => (
                <div key={day} className="py-2">
                  {day}
                </div>
              ))}
              {cells.map((date, index) => {
                if (!date) return <div key={`e-${index}`} />;
                const iso = toISO(date);
                const daySlots = days[iso] || [];
                const hasFree = daySlots.some((slot) => slot.available);
                const isSelected = selectedDate === iso;
                const disabled = daySlots.length === 0 || !hasFree;
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setSelectedDate(iso);
                      setSelectedTime("");
                    }}
                    className={`h-9 rounded-xl text-xs transition-transform duration-200 sm:h-11 sm:text-sm ${
                      isSelected
                        ? "bg-navy text-white dark:bg-brand dark:text-navy"
                        : disabled
                          ? "text-line"
                          : "text-navy hover:scale-110 hover:bg-sky"
                    }`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </MagneticCard>

        <MagneticCard delay={0.1} strength={8} scale={1.02} className="h-full">
          <form onSubmit={submit} className={`${PANEL_CLASS} p-4 text-ink sm:p-6`}>
            <h3 className="text-xl font-semibold text-navy sm:text-2xl">
              {selectedDate ? t("booking.slotsOn", { date: selectedDate }) : t("booking.pickDay")}
            </h3>
            {selectedClinic?.clinicName ? (
              <p className="mt-1 text-sm text-muted">
                {t("booking.clinic", {
                  name: selectedClinic.clinicName,
                  address: selectedClinic.clinicAddress || "",
                })}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedDate && availableSlots.length === 0 && (
                <p className="text-sm text-muted">{t("booking.noSlots")}</p>
              )}
              {availableSlots.map((slot) => (
                <Magnetic key={slot.time} strength={10}>
                  <button
                    type="button"
                    onClick={() => setSelectedTime(slot.time)}
                    className={`rounded-md border px-3 py-2 text-sm text-navy ${
                      selectedTime === slot.time ? "border-brand bg-brand-soft" : "border-line"
                    }`}
                  >
                    {slot.time}
                  </button>
                </Magnetic>
              ))}
            </div>

            <div className="mt-5 grid gap-3">
              <label className="text-sm">
                {t("booking.name")}
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2 text-ink"
                  placeholder={t("booking.namePlaceholder")}
                />
              </label>
              <label className="text-sm">
                {t("booking.phone")}
                <div className="mt-1 flex overflow-hidden rounded-xl border border-line bg-bg">
                  <span className="flex items-center border-r border-line px-3 text-muted">{COUNTRY_PREFIX}</span>
                  <input
                    required
                    value={phone}
                    onChange={(event) => setPhone(formatLocalPhone(event.target.value))}
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-ink outline-none"
                    placeholder="90 123 45 67"
                    inputMode="tel"
                    autoComplete="tel-national"
                  />
                </div>
                <span className="mt-1 block text-xs text-muted">{t("booking.phoneHint")}</span>
              </label>
              <label className="text-sm">
                {t("booking.comment")}
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  className="mt-1 min-h-20 w-full rounded-xl border border-line bg-bg px-3 py-2 text-ink"
                  placeholder={t("booking.commentPlaceholder")}
                />
              </label>
            </div>

            <Magnetic className="mt-5 block w-full" strength={12}>
              <button
                type="submit"
                disabled={!selectedDate || !selectedTime || !normalizePhone(phone) || status === "loading"}
                className={`${PRIMARY_BTN_CLASS} w-full py-3 disabled:opacity-40`}
              >
                {status === "loading" ? t("booking.sending") : t("booking.submit")}
              </button>
            </Magnetic>
            {message && (
              <p className={`mt-3 text-sm ${status === "error" ? "text-danger" : "text-ok"}`}>{message}</p>
            )}
          </form>
        </MagneticCard>
      </div>
      {booked && (
        <div className="mt-6">
          <BookingReceipt
            appointment={booked.appointment}
            doctor={booked.doctor}
            locale={locale}
            cancelled={cancelled}
            canceling={canceling}
            onCancel={cancelled ? undefined : cancelBooking}
            cancelLabel={t("booking.cancel")}
            cancelledHint={t("booking.cancelled")}
          />
        </div>
      )}
    </PageSection>
  );
}
