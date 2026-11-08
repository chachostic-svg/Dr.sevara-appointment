"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchJson } from "@/lib/api";
import { buildMonthCells, monthLabel, toISO } from "@/lib/booking-calendar";
import { COUNTRY_PREFIX, formatLocalPhone, normalizePhone } from "@/lib/phone";
import { INTL_LOCALE, LOCALES, translate } from "@/lib/i18n";
import { PANEL_CLASS, PRIMARY_BTN_CLASS } from "@/lib/ui";
import { BookingReceipt } from "@/components/BookingReceipt";

function getTelegram() {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp || null;
}

const LANGS = LOCALES.map((id) => ({ id, label: translate("ru", `lang.${id}`) }));

function LanguageGate({ isPreview, onPick }) {
  return (
    <div
      className={
        isPreview ? "min-h-dvh bg-sky/40 px-3 py-6 dark:bg-navy md:flex md:flex-col md:items-center" : ""
      }
    >
      <div
        className={`mini-shell mx-auto flex max-w-md flex-col justify-center bg-bg px-4 py-8 text-ink ${
          isPreview
            ? "min-h-[min(844px,90dvh)] w-full rounded-[1.75rem] border border-line shadow-lg md:w-[390px]"
            : "min-h-dvh"
        }`}
      >
        <p className="text-sm font-medium text-teal">Dr. Sevara</p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">Выберите язык</h1>
        <p className="mt-1 text-sm text-muted">Tilni tanlang · Choose language</p>
        <div className="mt-6 grid gap-3">
          {LANGS.map((lang) => (
            <button
              key={lang.id}
              type="button"
              onClick={() => onPick(lang.id)}
              className={`${PRIMARY_BTN_CLASS} w-full py-3`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MiniApp({ doctor, localPreview = false, initialYear, initialMonth }) {
  const [locale, setLocale] = useState("");
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [previewReady, setPreviewReady] = useState(false);
  const [days, setDays] = useState({});
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [insideTelegram, setInsideTelegram] = useState(false);
  const [booked, setBooked] = useState(null);
  const [cancelled, setCancelled] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const t = useCallback((path, vars) => translate(locale || "ru", path, vars), [locale]);
  const intlLocale = INTL_LOCALE[locale || "ru"];
  const weekdays = t("weekdays");
  const from = toISO(new Date(year, month, 1));
  const to = toISO(new Date(year, month + 1, 0));
  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);
  const daySlots = days[selectedDate] || [];
  const availableSlots = daySlots.filter((slot) => slot.available);
  const selectedClinic = daySlots.find((slot) => slot.clinicName);
  const canSubmit = Boolean(selectedDate && selectedTime && normalizePhone(phone) && name.trim().length >= 2);
  const cardDoctor = { name: t("doctor.name"), title: t("doctor.title") };

  useEffect(() => {
    setPreviewReady(true);
    const tg = getTelegram();
    if (!tg) return;

    try {
      tg.ready();
      tg.expand();
    } catch {
      /* Telegram WebView still works without expand() */
    }
    setInsideTelegram(Boolean(tg.initData));
    document.documentElement.classList.remove("dark");
    setName("");

    const user = tg.initDataUnsafe?.user;
    const blocked = new Set(
      [user?.username, user?.first_name, [user?.first_name, user?.last_name].filter(Boolean).join(" ")]
        .filter(Boolean)
        .map((value) => String(value).trim())
    );
    const clearAutofill = () => {
      setName((current) => (blocked.has(current.trim()) ? "" : current));
    };
    const interval = setInterval(clearAutofill, 150);
    const stop = setTimeout(() => clearInterval(interval), 2500);

    return () => {
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const { data } = await fetchJson(`/api/slots?from=${from}&to=${to}`);
        if (!ignore) setDays(data.days || {});
      } catch {
        if (!ignore) setDays({});
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [from, to, status]);

  useEffect(() => {
    const tg = getTelegram();
    const button = tg?.MainButton;
    if (!button) return undefined;
    try {
      if (!locale) {
        button.hide();
        return undefined;
      }
      button.setText(status === "loading" ? t("booking.sending") : t("nav.book"));
      if (canSubmit && status !== "loading" && status !== "success" && !(booked && !cancelled)) {
        button.show();
        button.enable();
      } else {
        button.hide();
      }
      const onClick = () => submit();
      button.onClick(onClick);
      return () => {
        try {
          button.offClick(onClick);
        } catch {
          /* ignore */
        }
      };
    } catch {
      return undefined;
    }
  }, [canSubmit, status, booked, cancelled, name, phone, selectedDate, selectedTime, comment, locale, t]);

  function shiftMonth(delta) {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
    setSelectedDate("");
    setSelectedTime("");
  }

  const submit = useCallback(
    async (event) => {
      event?.preventDefault();
      if (!canSubmit || status === "loading" || !locale) return;
      setStatus("loading");
      setMessage("");
      const tg = getTelegram();
      const { ok, status: httpStatus, data } = await fetchJson("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-init-data": tg?.initData || "",
        },
        body: JSON.stringify({
          name,
          phone: normalizePhone(phone),
          date: selectedDate,
          time: selectedTime,
          comment,
          source: "mini",
          locale,
        }),
      });
      if (!ok) {
        setStatus("error");
        setMessage(httpStatus === 409 ? t("booking.slotTaken") : t("booking.fail"));
        if (insideTelegram) tg?.HapticFeedback?.notificationOccurred("error");
        return;
      }
      setStatus("success");
      setBooked({ appointment: data.appointment, doctor: data.doctor || doctor });
      setCancelled(false);
      setMessage(insideTelegram ? t("mini.bookedChat") : "");
      setName("");
      setPhone("");
      setComment("");
      setSelectedDate("");
      setSelectedTime("");
      if (insideTelegram) {
        tg?.HapticFeedback?.notificationOccurred("success");
      }
    },
    [canSubmit, comment, doctor, insideTelegram, locale, name, phone, selectedDate, selectedTime, status, t]
  );

  async function cancelBooking() {
    if (!booked?.appointment?.id) return;
    setCanceling(true);
    const { ok } = await fetchJson(`/api/appointments/${booked.appointment.id}/cancel`, {
      method: "POST",
    });
    setCanceling(false);
    if (!ok) {
      setMessage(t("booking.cancelFail"));
      return;
    }
    setCancelled(true);
    setStatus("idle");
    setMessage(t("mini.slotFreed"));
    getTelegram()?.HapticFeedback?.notificationOccurred("success");
  }

  const isPreview = previewReady && localPreview && !insideTelegram;

  if (!locale) {
    return <LanguageGate isPreview={isPreview} onPick={setLocale} />;
  }

  return (
    <div
      className={
        isPreview
          ? "min-h-dvh bg-sky/40 px-3 py-6 dark:bg-navy md:flex md:flex-col md:items-center"
          : ""
      }
    >
      {isPreview && (
        <p className="mb-4 max-w-md text-center text-sm text-muted">
          {t("mini.preview", { url: "http://localhost:3000/mini" })}
        </p>
      )}
      <div
        className={`mini-shell mx-auto flex max-w-md flex-col bg-bg px-4 py-4 text-ink ${
          isPreview
            ? "min-h-[min(844px,90dvh)] w-full overflow-y-auto rounded-[1.75rem] border border-line shadow-lg md:w-[390px]"
            : "min-h-dvh"
        }`}
      >
      <header className="mb-4">
        <p className="text-sm font-medium text-teal">Medion · CityMed</p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">{t("mini.title", { name: cardDoctor.name })}</h1>
        <p className="mt-1 text-sm text-muted">{t("mini.lead", { title: cardDoctor.title })}</p>
      </header>

      {isPreview && (
        <p className="mb-4 rounded-xl bg-sky/50 px-3 py-2 text-sm text-muted dark:bg-brand-soft">
          {t("mini.previewHint")}
        </p>
      )}
      {!isPreview && !insideTelegram && (
        <p className="mb-4 rounded-xl bg-sky/50 px-3 py-2 text-sm text-muted dark:bg-brand-soft">
          {t("mini.outside")}
        </p>
      )}

      <div className={`${PANEL_CLASS} p-4`}>
        <div className="flex items-center justify-between gap-2">
          <button type="button" className="rounded-xl border border-line px-3 py-1" onClick={() => shiftMonth(-1)}>
            ←
          </button>
          <h2 className="text-base font-semibold">{monthLabel(year, month, intlLocale)}</h2>
          <button type="button" className="rounded-xl border border-line px-3 py-1" onClick={() => shiftMonth(1)}>
            →
          </button>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
          {(Array.isArray(weekdays) ? weekdays : []).map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
          {cells.map((date, index) => {
            if (!date) return <div key={`e-${index}`} />;
            const iso = toISO(date);
            const daySlotsForCell = days[iso] || [];
            const hasFree = daySlotsForCell.some((slot) => slot.available);
            const isSelected = selectedDate === iso;
            const disabled = daySlotsForCell.length === 0 || !hasFree;
            return (
              <button
                key={iso}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setSelectedDate(iso);
                  setSelectedTime("");
                }}
                className={`h-9 rounded-xl text-xs ${
                  isSelected ? "bg-navy text-white dark:bg-brand dark:text-navy" : disabled ? "text-line" : "bg-sky/40 dark:bg-brand-soft"
                }`}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={submit} className={`${PANEL_CLASS} mt-4 flex-1 p-4`}>
        <h2 className="text-lg font-semibold">{selectedDate ? t("booking.slotsOn", { date: selectedDate }) : t("booking.pickDay")}</h2>
        {selectedClinic?.clinicName ? (
          <p className="mt-1 text-sm text-muted">
            {selectedClinic.clinicName}
            {selectedClinic.clinicAddress ? `, ${selectedClinic.clinicAddress}` : ""}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedDate && availableSlots.length === 0 && (
            <p className="text-sm text-muted">{t("booking.noSlots")}</p>
          )}
          {availableSlots.map((slot) => (
            <button
              key={slot.time}
              type="button"
              onClick={() => setSelectedTime(slot.time)}
              className={`rounded-xl border px-3 py-2 text-sm ${
                selectedTime === slot.time ? "border-brand bg-brand-soft" : "border-line"
              }`}
            >
              {slot.time}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3">
          <label className="text-sm">
            {t("booking.name")}
            <input
              required
              name="patient-display-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2"
              placeholder={t("booking.namePlaceholder")}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="words"
              spellCheck={false}
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
                className="min-w-0 flex-1 bg-transparent px-3 py-2 outline-none"
                placeholder="90 123 45 67"
                inputMode="tel"
                autoComplete="tel-national"
              />
            </div>
          </label>
          <label className="text-sm">
            {t("booking.comment")}
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className="mt-1 min-h-20 w-full rounded-xl border border-line bg-bg px-3 py-2"
              placeholder={t("booking.commentPlaceholder")}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={!canSubmit || status === "loading"}
          className={`${PRIMARY_BTN_CLASS} mt-4 w-full py-3 disabled:opacity-40`}
        >
          {status === "loading" ? t("booking.sending") : t("booking.submit")}
        </button>
        {message && !booked && (
          <p className={`mt-3 text-sm ${status === "error" ? "text-danger" : "text-ok"}`}>{message}</p>
        )}
      </form>
      {booked && (
        <div className="mt-4">
          <BookingReceipt
            appointment={booked.appointment}
            doctor={cardDoctor}
            locale={locale}
            cancelled={cancelled}
            canceling={canceling}
            cancelLabel={t("booking.cancel")}
            cancelledHint={t("mini.slotFreed")}
            cancelingLabel={t("mini.canceling")}
            onCancel={cancelled ? undefined : cancelBooking}
          />
          {message && cancelled ? <p className="mt-2 text-sm text-ok">{message}</p> : null}
        </div>
      )}
      </div>
    </div>
  );
}
