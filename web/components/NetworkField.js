"use client";

import { useEffect, useRef } from "react";

export function NetworkField({ tone = "auto" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return undefined;

    const ctx = canvas.getContext("2d", { alpha: true });
    const parent = canvas.parentElement;
    const mouse = { x: -9999, y: -9999 };
    const particles = [];
    let frame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    function colors() {
      if (tone === "hero") {
        return { dot: "rgba(200, 217, 230, 0.38)", line: [200, 217, 230], lineAlpha: 0.16 };
      }
      const dark = document.documentElement.classList.contains("dark");
      return dark
        ? { dot: "rgba(200, 217, 230, 0.55)", line: [200, 217, 230], lineAlpha: 0.28 }
        : { dot: "rgba(11, 42, 68, 0.42)", line: [11, 42, 68], lineAlpha: 0.34 };
    }

    function resize() {
      const box = parent.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = box.width;
      height = box.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.max(28, Math.min(68, Math.round((width * height) / 14000)));
      particles.length = 0;
      for (let i = 0; i < count; i += 1) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 1.15,
          vy: (Math.random() - 0.5) * 1.15,
          r: 1.2 + Math.random() * 2.2,
        });
      }
    }

    function onMove(event) {
      const box = canvas.getBoundingClientRect();
      mouse.x = event.clientX - box.left;
      mouse.y = event.clientY - box.top;
    }

    function onLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }

    function link(a, b, rgb, baseAlpha, maxDist) {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.hypot(dx, dy);
      if (dist > maxDist) return;
      const alpha = (1 - dist / maxDist) * baseAlpha;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    function tick() {
      ctx.clearRect(0, 0, width, height);
      const { dot, line, lineAlpha } = colors();
      const linkDist = 150;
      const grabDist = 140;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        p.x = Math.min(width, Math.max(0, p.x));
        p.y = Math.min(height, Math.max(0, p.y));
      }

      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          link(particles[i], particles[j], line, lineAlpha, linkDist);
        }
        link(particles[i], mouse, line, 0.45, grabDist);
      }

      ctx.fillStyle = dot;
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      frame = requestAnimationFrame(tick);
    }

    resize();
    tick();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, [tone]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
      aria-hidden="true"
    />
  );
}
