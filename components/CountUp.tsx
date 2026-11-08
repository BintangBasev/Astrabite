"use client";
import { useEffect, useState } from "react";
import { rp } from "@/lib/format";

/** Angka yang naik dari nol saat halaman dibuka. Teks dikelola lewat state React (tidak mengubah DOM langsung). */
export default function CountUp({ value, money = false }: { value: number; money?: boolean }) {
  const [v, setV] = useState(value);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(value); return; }
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 1000);
      setV(value * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span>{money ? rp(v) : Math.round(v)}</span>;
}
