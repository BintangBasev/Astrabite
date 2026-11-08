import LoadError from "@/components/LoadError";
import Kasir from "@/components/Kasir";
import { createClient } from "@/lib/supabase/server";
import { loadCore, loadToday } from "@/lib/data";

export const dynamic = "force-dynamic";

async function KasirPageInner() {
  const sb = await createClient();
  const [core, today, antri] = await Promise.all([
    loadCore(sb),
    loadToday(sb),
    sb.from("orders").select("*, order_items(order_id, menu_id, qty, harga, hpp)").neq("status", "selesai")
      .gte("created_at", new Date(Date.now() - 12 * 3600e3).toISOString()).order("created_at"),
  ]);
  return <Kasir {...core} topId={today.top[0]?.[0] ?? null} antrian={antri.data ?? []} />;
}

export default async function KasirPage() {
  try {
    return await KasirPageInner();
  } catch (e) {
    return <LoadError error={e} where="Kasir" />;
  }
}
