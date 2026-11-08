import LoadError from "@/components/LoadError";
import TvManager from "@/components/TvManager";
import { createClient } from "@/lib/supabase/server";
import { loadCore, loadScreens } from "@/lib/data";

export const dynamic = "force-dynamic";

async function TvPageInner() {
  const sb = await createClient();
  const [core, screens] = await Promise.all([loadCore(sb), loadScreens(sb)]);
  return <TvManager settings={core.settings} screens={screens} />;
}

export default async function TvPage() {
  try {
    return await TvPageInner();
  } catch (e) {
    return <LoadError error={e} where="Layar TV" />;
  }
}
