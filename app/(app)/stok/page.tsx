import LoadError from "@/components/LoadError";
import Stok from "@/components/Stok";
import { createClient } from "@/lib/supabase/server";
import { loadCore, loadUsage } from "@/lib/data";

export const dynamic = "force-dynamic";

async function StokPageInner() {
  const sb = await createClient();
  const [core, usage] = await Promise.all([loadCore(sb), loadUsage(sb)]);
  return <Stok ings={core.ings} usage={usage} />;
}

export default async function StokPage() {
  try {
    return await StokPageInner();
  } catch (e) {
    return <LoadError error={e} where="Stok" />;
  }
}
