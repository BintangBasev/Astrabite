import TvManager from "@/components/TvManager";
import { createClient } from "@/lib/supabase/server";
import { loadCore, loadScreens } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TvPage() {
  const sb = await createClient();
  const [core, screens] = await Promise.all([loadCore(sb), loadScreens(sb)]);
  return <TvManager settings={core.settings} screens={screens} />;
}
