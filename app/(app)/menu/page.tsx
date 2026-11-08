import LoadError from "@/components/LoadError";
import MenuManager from "@/components/MenuManager";
import { createClient } from "@/lib/supabase/server";
import { loadCore } from "@/lib/data";

export const dynamic = "force-dynamic";

async function MenuPageInner() {
  const sb = await createClient();
  const core = await loadCore(sb);
  return <MenuManager menus={core.menus} ings={core.ings} recipes={core.recipes} />;
}

export default async function MenuPage() {
  try {
    return await MenuPageInner();
  } catch (e) {
    return <LoadError error={e} where="Menu" />;
  }
}
