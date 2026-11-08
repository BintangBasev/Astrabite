import type { SupabaseClient } from "@supabase/supabase-js";
import { awalHariIniIso } from "./format";
import type { ContentPost, Expense, Ingredient, Menu, Order, OrderItem, Promo, Recipe, Settings, TvScreen } from "./types";

const num = <T extends Record<string, unknown>>(rows: T[] | null, keys: (keyof T)[]) =>
  (rows ?? []).map((r) => {
    const o = { ...r };
    for (const k of keys) (o as Record<string, unknown>)[k as string] = Number(r[k]);
    return o;
  });

export async function loadCore(sb: SupabaseClient) {
  const [m, i, r, p, s] = await Promise.all([
    sb.from("menus").select("*").order("kategori").order("nama"),
    sb.from("ingredients").select("*").order("nama"),
    sb.from("recipes").select("*"),
    sb.from("promos").select("*").order("created_at", { ascending: false }),
    sb.from("settings").select("*").eq("id", 1).maybeSingle(),
  ]);
  const err = m.error || i.error || r.error || p.error || s.error;
  if (err) throw new Error(err.message);
  return {
    menus: (m.data ?? []) as Menu[],
    ings: num(i.data, ["stok", "stok_min", "harga_per_satuan", "langkah"]) as Ingredient[],
    recipes: num(r.data, ["qty"]) as Recipe[],
    promos: (p.data ?? []) as Promo[],
    settings: (s.data ?? defaultSettings) as Settings,
  };
}

export const defaultSettings: Settings = {
  nama_toko: "AstraBite",
  target_harian: 1500000,
  instagram: "",
  tiktok: "",
  whatsapp: "",
  tv_playlist: { menu: true, promo: true, best: true, queue: true, social: true, testi: true },
  tv_durasi: 8,
  tv_ticker: "",
  tv_sembunyikan_habis: false,
  tv_testimoni: [],
};

export async function loadToday(sb: SupabaseClient) {
  const since = awalHariIniIso();
  const [o, e] = await Promise.all([
    sb.from("orders").select("*, order_items(order_id, menu_id, qty, harga, hpp)").gte("created_at", since).order("created_at", { ascending: false }),
    sb.from("expenses").select("*").gte("created_at", since).order("created_at", { ascending: false }),
  ]);
  if (o.error || e.error) throw new Error((o.error || e.error)!.message);
  const orders = (o.data ?? []) as (Order & { order_items: OrderItem[] })[];
  const items = orders.flatMap((x) => x.order_items);
  const qty: Record<string, number> = {};
  for (const it of items) qty[it.menu_id] = (qty[it.menu_id] ?? 0) + it.qty;
  const omzet = orders.reduce((s, x) => s + x.total, 0);
  const modal = items.reduce((s, x) => s + x.qty * x.hpp, 0);
  const keluar = (e.data ?? []).reduce((s, x) => s + x.nominal, 0);
  return {
    orders,
    expenses: (e.data ?? []) as Expense[],
    qty,
    top: Object.entries(qty).sort((a, b) => b[1] - a[1]),
    omzet,
    modal,
    keluar,
    bersih: omzet - modal - keluar,
  };
}

export interface DailyRow { tanggal: string; omzet: number; trx: number; modal: number }

export async function loadDaily(sb: SupabaseClient, days = 7): Promise<DailyRow[]> {
  const { data, error } = await sb.rpc("sales_daily", { p_days: days });
  if (error) throw new Error(error.message);
  return ((data ?? []) as DailyRow[]).map((d) => ({
    tanggal: d.tanggal,
    omzet: Number(d.omzet),
    trx: Number(d.trx),
    modal: Number(d.modal),
  }));
}

/** Pemakaian rata-rata per hari tiap bahan (7 hari terakhir, dari penjualan). */
export async function loadUsage(sb: SupabaseClient) {
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const { data, error } = await sb.from("stock_movements").select("ingredient_id, qty").eq("tipe", "jual").gte("created_at", since);
  if (error) throw new Error(error.message);
  const u: Record<string, number> = {};
  for (const m of data ?? []) u[m.ingredient_id] = (u[m.ingredient_id] ?? 0) + Math.abs(Number(m.qty)) / 7;
  return u;
}

export async function loadPromoStudio(sb: SupabaseClient) {
  const { data, error } = await sb.from("content_posts").select("*").order("created_at", { ascending: false }).limit(30);
  if (error) throw new Error(error.message);
  return (data ?? []) as ContentPost[];
}

export async function loadScreens(sb: SupabaseClient) {
  const { data, error } = await sb.from("tv_screens").select("*").order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as TvScreen[];
}

/** Jam paling rame (WIB) dari pesanan 14 hari terakhir. */
export async function loadPeakHour(sb: SupabaseClient) {
  const since = new Date(Date.now() - 14 * 864e5).toISOString();
  const { data } = await sb.from("orders").select("created_at").gte("created_at", since).limit(2000);
  const h: Record<number, number> = {};
  for (const o of data ?? []) {
    const jam = Number(new Date(o.created_at).toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }));
    h[jam] = (h[jam] ?? 0) + 1;
  }
  const best = Object.entries(h).sort((a, b) => b[1] - a[1])[0];
  return best ? Number(best[0]) : 12;
}
