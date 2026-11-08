"use client";
import { useEffect, useRef } from "react";
import { rp } from "@/lib/format";

export default function CountUp({ value, money = false }: { value: number; money?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 1000);
      const v = value * (1 - Math.pow(1 - k, 3));
      el.textContent = money ? rp(v) : String(Math.round(v));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, money]);
  return <span ref={ref}>{money ? rp(value) : value}</span>;
}
