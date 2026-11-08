import LoadError from "@/components/LoadError";
import Cuan from "@/components/Cuan";
import { createClient } from "@/lib/supabase/server";
import { loadCore, loadToday } from "@/lib/data";

export const dynamic = "force-dynamic";

async function CuanPageInner() {
  const sb = await createClient();
  const [core, today] = await Promise.all([loadCore(sb), loadToday(sb)]);
  return <Cuan ings={core.ings} expenses={today.expenses} omzet={today.omzet} modal={today.modal} keluar={today.keluar} />;
}

export default async function CuanPage() {
  try {
    return await CuanPageInner();
  } catch (e) {
    return <LoadError error={e} where="Cuan Tracker" />;
  }
}
