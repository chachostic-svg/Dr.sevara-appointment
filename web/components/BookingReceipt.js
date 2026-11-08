import { PANEL_CLASS, PRIMARY_BTN_CLASS } from "@/lib/ui";
import { formatBookingCard } from "@/lib/format";
import { Magnetic } from "./Magnetic";

export function BookingReceipt({
  appointment,
  doctor,
  locale = "ru",
  cancelled = false,
  canceling = false,
  onCancel,
  cancelLabel = "Отменить запись",
  cancelledHint = "Это время снова свободно.",
  cancelingLabel = "Отменяем...",
}) {
  const text = formatBookingCard(appointment, doctor, { cancelled, locale });
  const [title, ...rest] = text.split("\n");

  return (
    <div className={`${PANEL_CLASS} p-4 text-ink sm:p-6`}>
      <p className="text-base font-semibold">{title}</p>
      <pre className={`mt-2 whitespace-pre-wrap font-sans text-sm leading-7 sm:text-base ${cancelled ? "line-through opacity-70" : ""}`}>
        {rest.join("\n").trim()}
      </pre>
      {cancelled ? (
        <p className="mt-3 text-sm text-ok no-underline">{cancelledHint}</p>
      ) : onCancel ? (
        <Magnetic className="mt-4 block w-full">
          <button
            type="button"
            onClick={onCancel}
            disabled={canceling}
            className={`${PRIMARY_BTN_CLASS} w-full py-3 disabled:opacity-40`}
          >
            {canceling ? cancelingLabel : cancelLabel}
          </button>
        </Magnetic>
      ) : null}
    </div>
  );
}
