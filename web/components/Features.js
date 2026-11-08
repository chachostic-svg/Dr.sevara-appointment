"use client";

import { MagneticCard } from "./MagneticCard";
import { useI18n } from "./LocaleProvider";

export function Features() {
  const { t } = useI18n();
  const items = t("features");

  return (
    <section className="relative z-10 mx-auto -mt-14 max-w-6xl px-4 pb-6 sm:-mt-16 sm:pb-10">
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item, index) => (
          <MagneticCard key={item.title} delay={index * 0.08} strength={10}>
            <article className="flex h-full gap-4 rounded-xl border border-line bg-white p-5 shadow-[var(--shadow)] dark:bg-bg-elev">
              <span className="text-sm font-semibold tracking-[0.16em] text-teal">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-medium">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{item.text}</p>
              </div>
            </article>
          </MagneticCard>
        ))}
      </div>
    </section>
  );
}
