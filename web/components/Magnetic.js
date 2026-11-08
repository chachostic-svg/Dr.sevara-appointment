"use client";

import { useRef, useState } from "react";

export function Magnetic({ children, className = "", strength = 14, scale = 1.06 }) {
  const ref = useRef(null);
  const [shift, setShift] = useState({ x: 0, y: 0 });

  function onMove(event) {
    if (!ref.current || window.matchMedia("(hover: hover)").matches === false) return;
    const box = ref.current.getBoundingClientRect();
    const x = event.clientX - (box.left + box.width / 2);
    const y = event.clientY - (box.top + box.height / 2);
    setShift({
      x: (x / box.width) * strength,
      y: (y / box.height) * strength,
    });
  }

  return (
    <div
      ref={ref}
      className={["magnetic", "will-change-transform", className || "inline-block"].filter(Boolean).join(" ")}
      style={{
        "--mx": `${shift.x}px`,
        "--my": `${shift.y}px`,
        "--ms": String(scale),
      }}
      onMouseMove={onMove}
      onMouseLeave={() => setShift({ x: 0, y: 0 })}
    >
      {children}
    </div>
  );
}
