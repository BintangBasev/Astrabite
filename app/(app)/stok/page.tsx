import Stok from "@/components/Stok";
import { createClient } from "@/lib/supabase/server";
import { loadCore, loadUsage } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function StokPage() {
  const sb = await createClient();
  const [core, usage] = await Promise.all([loadCore(sb), loadUsage(sb)]);
  return <Stok ings={core.ings} usage={usage} />;
}
