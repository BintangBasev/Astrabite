import PromoStudio from "@/components/PromoStudio";
import { createClient } from "@/lib/supabase/server";
import { loadCore, loadPromoStudio } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PromoPage() {
  const sb = await createClient();
  const [core, posts] = await Promise.all([loadCore(sb), loadPromoStudio(sb)]);
  return <PromoStudio menus={core.menus.filter((m) => m.aktif)} promos={core.promos} settings={core.settings} posts={posts} />;
}
