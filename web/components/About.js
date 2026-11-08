"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "./Reveal";
import { useI18n } from "./LocaleProvider";

export function About() {
  const { t } = useI18n();
  const education = t("doctor.education") || [];
  const specialties = t("doctor.specialties") || [];
  const approach = t("doctor.approach") || [];
  const clinics = t("doctor.clinics") || [];
  const [index, setIndex] = useState(0);
  const itemRefs = useRef([]);

  const slides = [
    {
      key: "bio",
      number: "01",
      title: t("about.slideBio"),
      body: (
        <>
          <p className="text-sm leading-7 text-muted sm:text-base sm:leading-8">{t("doctor.bio")}</p>
          <ul className="mt-6 space-y-3">
            {approach.map((item) => (
              <li key={item} className="flex gap-3 text-sm sm:text-base">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-teal" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </>
      ),
    },
    {
      key: "education",
      number: "02",
      title: t("about.education"),
      body: (
        <>
          <div className="space-y-4">
            {education.map((item) => (
              <div key={`${item.year}-${item.place}`} className="grid grid-cols-[5.2rem_1fr] gap-3 border-b border-line pb-4 last:border-0 sm:grid-cols-[6.5rem_1fr]">
                <div className="text-sm text-teal">{item.year}</div>
                <div>
                  <div className="font-medium">{item.place}</div>
                  <div className="text-sm text-muted">{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {specialties.map((item) => (
              <span key={item} className="inline-block rounded-xl bg-sky px-3 py-1 text-sm text-navy dark:bg-brand-soft dark:text-ink">
                {item}
              </span>
            ))}
          </div>
        </>
      ),
    },
    {
      key: "clinics",
      number: "03",
      title: t("about.hours"),
      body: (
        <div className="space-y-5">
          <p className="text-sm text-muted">{t("doctor.hours")}</p>
          {clinics.map((clinic) => (
            <div key={clinic.name} className="rounded-xl border border-line bg-sky/40 px-4 py-4 dark:bg-brand-soft">
              <div className="font-medium">{clinic.name}</div>
              <div className="mt-1 text-sm text-muted">{clinic.address}</div>
              <div className="text-sm text-muted">{clinic.days}</div>
            </div>
          ))}
        </div>
      ),
    },
  ];

  useEffect(() => {
    const nodes = itemRefs.current.filter(Boolean);
    if (!nodes.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const next = nodes.indexOf(visible.target);
        if (next >= 0) setIndex(next);
      },
      { rootMargin: "-35% 0px -45% 0px", threshold: [0.15, 0.4, 0.7] }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [slides.length]);

  function goTo(i) {
    setIndex(i);
    itemRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <section id="about" className="bg-white py-16 sm:py-24 dark:bg-bg">
      <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 lg:grid-cols-2 lg:gap-16">
        <div>
          <Reveal>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal">{t("about.eyebrow")}</p>
            <h2 className="mt-3 text-4xl font-semibold sm:text-5xl">{t("about.title")}</h2>
          </Reveal>

          <div className="mt-10">
            {slides.map((slide, i) => (
              <article
                key={slide.key}
                ref={(node) => {
                  itemRefs.current[i] = node;
                }}
                className={`border-t border-line py-12 first:border-t-0 first:pt-0 last:pb-4 ${i === index ? "opacity-100" : "opacity-55"}`}
              >
                <div className="text-xs font-semibold tracking-[0.2em] text-teal">{slide.number}</div>
                <h3 className="mt-2 text-2xl font-semibold sm:text-3xl">{slide.title}</h3>
                <div className="mt-5">{slide.body}</div>
              </article>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            {slides.map((item, i) => (
              <button
                key={item.key}
                type="button"
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all ${i === index ? "w-8 bg-navy dark:bg-sky" : "w-2 bg-line"}`}
                aria-label={item.title}
              />
            ))}
          </div>
        </div>

        <div className="lg:sticky lg:top-28">
          <div className="relative rounded-xl border border-line bg-sky/25 p-3 shadow-[var(--shadow)] dark:bg-brand-soft">
            <div className="mb-3 flex items-center gap-1.5 px-1">
              <span className="h-2 w-2 rounded-full bg-line" />
              <span className="h-2 w-2 rounded-full bg-line" />
              <span className="h-2 w-2 rounded-full bg-line" />
            </div>
            <div className="overflow-hidden rounded-xl">
              <img
                src="/doctor.png"
                alt={t("doctor.name")}
                className="aspect-[4/3] w-full object-cover object-[center_18%] contrast-[1.04] saturate-[1.05]"
              />
            </div>
            <div className="mt-3 rounded-xl bg-navy px-4 py-3 text-white">
              <div className="text-sm text-sky">{t("doctor.title")}</div>
              <div className="font-semibold">{t("doctor.name")}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
