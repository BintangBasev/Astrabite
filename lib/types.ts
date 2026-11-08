export type Warna = "pink" | "sun" | "sky" | "lime" | "violet";

export interface Ingredient {
  id: string;
  nama: string;
  satuan: string;
  stok: number;
  stok_min: number;
  harga_per_satuan: number;
  langkah: number;
  emoji: string;
}

export interface Recipe {
  menu_id: string;
  ingredient_id: string;
  qty: number;
}

export interface Menu {
  id: string;
  nama: string;
  kategori: "Makanan" | "Minuman" | "Snack";
  harga: number;
  emoji: string;
  warna: Warna;
  panas: boolean;
  foto_url: string | null;
  aktif: boolean;
}

export interface Promo {
  id: string;
  menu_id: string;
  diskon: number;
  kode: string;
  aktif: boolean;
  dipakai: number;
}

export interface Order {
  id: string;
  nomor: number;
  total: number;
  metode_bayar: "QRIS" | "Cash" | "Transfer";
  status: "disiapkan" | "siap" | "selesai";
  created_at: string;
}

export interface OrderItem {
  order_id: string;
  menu_id: string;
  qty: number;
  harga: number;
  hpp: number;
}

export interface Expense {
  id: string;
  kategori: string;
  keterangan: string;
  nominal: number;
  via_scan: boolean;
  created_at: string;
}

export interface Settings {
  nama_toko: string;
  target_harian: number;
  instagram: string;
  tiktok: string;
  whatsapp: string;
  tv_playlist: Record<TvSlideKey, boolean>;
  tv_durasi: number;
  tv_ticker: string;
  tv_sembunyikan_habis: boolean;
  tv_testimoni: string[];
}

export type TvSlideKey = "menu" | "promo" | "best" | "queue" | "social" | "testi";

export interface TvScreen {
  id: string;
  nama: string;
  lokasi: string;
  token: string;
  last_seen: string | null;
}

export interface ContentPost {
  id: string;
  menu_id: string | null;
  platform: string;
  tujuan: string;
  hook: string;
  caption: string;
  status: "draft" | "terjadwal" | "diposting";
  jadwal: string | null;
  created_at: string;
}

export interface TvFeed {
  layar: string;
  settings: Omit<Settings, "target_harian">;
  menus: (Pick<Menu, "id" | "nama" | "kategori" | "harga" | "emoji" | "warna" | "panas" | "foto_url"> & {
    harga_jual: number;
    habis: boolean;
  })[];
  promos: { menu_id: string; diskon: number; kode: string }[];
  terlaris: { menu_id: string; qty: number }[];
  antrian: { disiapkan: number[]; siap: number[] };
}
