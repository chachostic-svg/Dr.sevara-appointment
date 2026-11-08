"use client";

import { TITLE_CLASS } from "@/lib/ui";
import { Magnetic } from "./Magnetic";

export function SectionHeader({ eyebrow, title, titleClassName = "", tone = "light", children }) {
  const dark = tone === "dark";

  return (
    <header>
      <p className={`text-sm font-medium uppercase tracking-[0.18em] ${dark ? "text-sky" : "text-teal"}`}>{eyebrow}</p>
      <Magnetic className="block max-w-4xl" strength={10} scale={1.03}>
        <h2 className={`${TITLE_CLASS} ${dark ? "text-white" : ""} ${titleClassName}`.trim()}>{title}</h2>
      </Magnetic>
      {children}
    </header>
  );
}
