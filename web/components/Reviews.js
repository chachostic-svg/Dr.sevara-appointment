"use client";

import { useState } from "react";
import { fetchJson } from "@/lib/api";
import { PANEL_CLASS, PRIMARY_BTN_CLASS } from "@/lib/ui";
import { Magnetic } from "./Magnetic";
import { MagneticCard } from "./MagneticCard";
import { PageSection } from "./PageSection";
import { Reveal } from "./Reveal";
import { SectionHeader } from "./SectionHeader";
import { useI18n } from "./LocaleProvider";

export function Reviews({ reviews: initialReviews }) {
  const { t, locale } = useI18n();
  const [reviews, setReviews] = useState(initialReviews);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    const { ok, data } = await fetchJson("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, text, rating, locale }),
    });
    if (!ok) {
      setStatus("error");
      setMessage(t("reviews.fail"));
      return;
    }
    setReviews((current) => [data.review, ...current].slice(0, 6));
    setName("");
    setText("");
    setRating(5);
    setStatus("success");
    setMessage(t("reviews.ok"));
  }

  return (
    <PageSection id="reviews" band bandClass="bg-white dark:bg-bg">
      <Reveal>
        <SectionHeader eyebrow={t("reviews.eyebrow")} title={t("reviews.title")} titleClassName="max-w-3xl" />
      </Reveal>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {reviews.length === 0 && <p className="text-sm text-muted">{t("reviews.empty")}</p>}
        {reviews.slice(0, 6).map((review, index) => (
          <MagneticCard key={review.id} delay={index * 0.08}>
            <article className="h-full rounded-2xl bg-sky/40 p-6 dark:bg-brand-soft">
              <div className="flex items-center justify-between gap-3">
                <strong>{review.name}</strong>
                <span className="text-teal">{"★".repeat(review.rating)}</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-muted sm:text-base">{review.text}</p>
            </article>
          </MagneticCard>
        ))}
      </div>

      <div id="review-forum" className="mt-16">
        <Reveal>
          <SectionHeader eyebrow={t("reviews.forumEyebrow")} title={t("reviews.forumTitle")} titleClassName="max-w-3xl">
            <p className="mt-3 max-w-2xl text-sm text-muted sm:text-base">{t("reviews.forumLead")}</p>
          </SectionHeader>
        </Reveal>
        <MagneticCard delay={0.08} strength={8} scale={1.02} className="mt-8 max-w-2xl">
          <form onSubmit={submit} className={`${PANEL_CLASS} p-4 sm:p-6`}>
            <label className="block text-sm">
              {t("reviews.name")}
              <input
                required
                minLength={2}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2"
                placeholder={t("reviews.namePlaceholder")}
              />
            </label>
            <fieldset className="mt-4">
              <legend className="text-sm">{t("reviews.rating")}</legend>
              <div className="mt-2 flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Magnetic key={value} strength={8}>
                    <button
                      type="button"
                      onClick={() => setRating(value)}
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        rating >= value ? "border-brand bg-brand-soft text-teal" : "border-line text-muted"
                      }`}
                      aria-pressed={rating === value}
                    >
                      ★ {value}
                    </button>
                  </Magnetic>
                ))}
              </div>
            </fieldset>
            <label className="mt-4 block text-sm">
              {t("reviews.text")}
              <textarea
                required
                minLength={12}
                value={text}
                onChange={(event) => setText(event.target.value)}
                className="mt-1 min-h-28 w-full rounded-xl border border-line bg-bg px-3 py-2"
                placeholder={t("reviews.textPlaceholder")}
              />
            </label>
            <Magnetic className="mt-5 block w-full">
              <button
                type="submit"
                disabled={status === "loading"}
                className={`${PRIMARY_BTN_CLASS} w-full py-3 disabled:opacity-40`}
              >
                {status === "loading" ? t("reviews.sending") : t("reviews.submit")}
              </button>
            </Magnetic>
            {message && (
              <p className={`mt-3 text-sm ${status === "error" ? "text-danger" : "text-ok"}`}>{message}</p>
            )}
          </form>
        </MagneticCard>
      </div>
    </PageSection>
  );
}
