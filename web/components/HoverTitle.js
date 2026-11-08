"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";

export function HoverTitle({ text, className = "", as: Tag = "h2", reveal = false, delay = 0 }) {
  const reduceMotion = useReducedMotion();
  const words = text.trim().split(/\s+/);

  if (!reveal) {
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <Tag className={className}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`} className="inline-block overflow-hidden pb-[0.12em] align-bottom -mb-[0.08em]">
          <motion.span
            className="inline-block"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: "0.55em" }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0.4 : 0.78,
              delay: delay + index * 0.1,
              ease: EASE_OUT,
            }}
          >
            {word}
            {index < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}
