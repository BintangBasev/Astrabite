export const rp = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");

export const jt = (n: number) =>
  Math.abs(n) >= 1e6
    ? (n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 2 }) + "jt"
    : Math.round(n / 1000) + "rb";

export const qtyFmt = (q: number, unit: string) =>
  (Number.isInteger(q) ? q : Number(q.toFixed(1))).toLocaleString("id-ID") + " " + unit;

export const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
export const HARI_PANJANG = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** Jam:menit di zona WIB. */
export const jamWib = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

/** Tanggal hari ini (YYYY-MM-DD) di WIB. */
export const hariIniWib = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

/** Awal hari ini (WIB) dalam ISO UTC, buat filter query. */
export const awalHariIniIso = () => new Date(hariIniWib() + "T00:00:00+07:00").toISOString();

export type StokStatus = "good" | "warn" | "bad";
export const stokStatus = (stok: number, min: number): StokStatus =>
  stok <= min ? "bad" : stok <= min * 1.5 ? "warn" : "good";
export const STATUS_LABEL: Record<StokStatus, string> = { bad: "Kritis 😭", warn: "Tipis 👀", good: "Aman ✨" };
