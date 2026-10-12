"use client";
import { useEffect, useRef } from "react";

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

/** The gmW wordmark. With `dodge`, it shies away from the cursor (or a touch) on a spring. */
export function Logo({ size = 28, dodge = false }: { size?: number; dodge?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!dodge || !el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const R = 150; // proximity radius
    const PAD = 16;
    let x = 0, y = 0, vx = 0, vy = 0, tx = 0, ty = 0;
    let seed = Math.random() * 6.28;
    let idle: ReturnType<typeof setTimeout>;
    let raf = 0;
    let last = { x: -9999, y: -9999 };

    const onPoint = (e: PointerEvent) => {
      last = { x: e.clientX, y: e.clientY };
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const d = Math.hypot(cx - e.clientX, cy - e.clientY);
      if (d < R) {
        const push = (R - d) / R;
        seed += 0.9 + Math.random() * 0.8;
        const ang = Math.atan2(cy - e.clientY, cx - e.clientX) + Math.sin(seed) * 0.7; // away, with a little randomness
        const dist = 70 + push * 170;
        const homeL = r.left - x, homeT = r.top - y;
        tx = clamp(x + Math.cos(ang) * dist, PAD - homeL, innerWidth - PAD - (homeL + r.width));
        ty = clamp(y + Math.sin(ang) * dist, PAD - homeT, innerHeight - PAD - (homeT + r.height));
      }
      clearTimeout(idle);
      idle = setTimeout(returnHome, 1200);
    };
    const returnHome = () => {
      const r = el.getBoundingClientRect();
      const hx = r.left + r.width / 2 - x, hy = r.top + r.height / 2 - y;
      if (Math.hypot(hx - last.x, hy - last.y) > R) { tx = 0; ty = 0; }
      else idle = setTimeout(returnHome, 600);
    };
    const leave = () => { tx = 0; ty = 0; };

    const tick = () => {
      vx = (vx + (tx - x) * 0.06) * 0.84;
      vy = (vy + (ty - y) * 0.06) * 0.84;
      x += vx; y += vy;
      const speed = Math.hypot(vx, vy);
      el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${(vx * 1.1).toFixed(2)}deg) scale(${(1 - Math.min(speed * 0.008, 0.1)).toFixed(3)})`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onPoint);
    window.addEventListener("pointerdown", onPoint);
    document.addEventListener("mouseleave", leave);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf); clearTimeout(idle);
      window.removeEventListener("pointermove", onPoint);
      window.removeEventListener("pointerdown", onPoint);
      document.removeEventListener("mouseleave", leave);
    };
  }, [dodge]);

  return (
    <div ref={ref} aria-label="gmW" role="img" style={{ fontSize: size }}
      className="inline-block select-none font-semibold leading-none tracking-tight will-change-transform">
      gm<span className="text-moon">W</span>
    </div>
  );
}
