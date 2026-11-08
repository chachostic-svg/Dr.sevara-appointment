"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Magnetic } from "./Magnetic";
import { NetworkField } from "./NetworkField";
import { EASE_OUT } from "@/lib/motion";
import { LIGHT_BTN_CLASS } from "@/lib/ui";
import { useI18n } from "./LocaleProvider";

function fadeUp(reduceMotion, delay) {
  return {
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0.4 : 0.8, delay, ease: EASE_OUT },
  };
}

function splitHeadline(text) {
  const words = String(text || "").trim().split(/\s+/);
  if (words.length < 2) return { lead: text, last: "" };
  const last = words.pop();
  return { lead: words.join(" "), last };
}

export function Hero({ doctor, slotMinutes = 30 }) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const headline = splitHeadline(t("hero.headline"));

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-navy text-white">
      <img
        src="/hero-bg.jpg"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[70%_center]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-navy/92 via-navy/55 to-navy/15" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/55 via-transparent to-navy/20" />
      <NetworkField tone="hero" />

      <div className="relative z-[2] mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-4 pb-24 pt-32 sm:pb-28 sm:pt-36">
        <motion.p {...fadeUp(reduceMotion, 0.08)} className="text-xs font-medium uppercase tracking-[0.28em] text-sky">
          {t("hero.kicker")}
        </motion.p>
        <Magnetic className="mt-4 block max-w-3xl" strength={12} scale={1.02}>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.08] sm:text-6xl lg:text-7xl">
            {headline.lead}{" "}
            <span className="text-sky">{headline.last}</span>
          </h1>
        </Magnetic>
        <motion.p {...fadeUp(reduceMotion, 0.45)} className="mt-5 max-w-2xl text-base leading-7 text-sky/90 sm:text-lg sm:leading-8">
          {t("hero.subtitle")}
        </motion.p>
        <motion.p {...fadeUp(reduceMotion, 0.55)} className="mt-3 text-sm text-sky/80">
          {t("hero.meta", { name: t("doctor.name"), title: t("doctor.title"), years: t("doctor.experience") })}
          {slotMinutes ? ` · ${slotMinutes} ${t("hero.minutes")}` : ""}
        </motion.p>
        <motion.div {...fadeUp(reduceMotion, 0.7)} className="mt-8 flex flex-wrap items-center gap-3">
          <Magnetic>
            <a href="#booking" className={`${LIGHT_BTN_CLASS} gap-2 px-6 py-3`}>
              {t("hero.book")}
              <span aria-hidden>→</span>
            </a>
          </Magnetic>
          <Magnetic>
            <a
              href="#about"
              className="inline-flex items-center justify-center rounded-xl border border-white/35 px-6 py-3 text-sm font-medium text-white hover:bg-white/10"
            >
              {t("hero.about")}
            </a>
          </Magnetic>
        </motion.div>

        <motion.a
          {...fadeUp(reduceMotion, 0.9)}
          href="#about"
          className="mt-14 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/35 text-sky transition hover:bg-white/10"
          aria-label={t("hero.about")}
        >
          ↓
        </motion.a>
      </div>
    </section>
  );
}
