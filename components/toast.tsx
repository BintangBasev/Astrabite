"use client";
import { useEffect, useState } from "react";

export function toast(msg: string) {
  window.dispatchEvent(new CustomEvent("ab-toast", { detail: msg }));
}

export function Toaster() {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const on = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail);
      setShow(true);
      clearTimeout(t);
      t = setTimeout(() => setShow(false), 2800);
    };
    window.addEventListener("ab-toast", on);
    return () => window.removeEventListener("ab-toast", on);
  }, []);
  return (
    <div className={`toast ${show ? "show" : ""}`} role="status" aria-live="polite">
      {msg}
    </div>
  );
}
