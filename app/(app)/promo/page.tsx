import LoadError from "@/components/LoadError";
import PromoStudio from "@/components/PromoStudio";
import { createClient } from "@/lib/supabase/server";
import { loadCore, loadPromoStudio } from "@/lib/data";

export const dynamic = "force-dynamic";

async function PromoPageInner() {
  const sb = await createClient();
  const [core, posts] = await Promise.all([loadCore(sb), loadPromoStudio(sb)]);
  return <PromoStudio menus={core.menus.filter((m) => m.aktif)} promos={core.promos} settings={core.settings} posts={posts} />;
}

export default async function PromoPage() {
  try {
    return await PromoPageInner();
  } catch (e) {
    return <LoadError error={e} where="Promo Studio" />;
  }
}
