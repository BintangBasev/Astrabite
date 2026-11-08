import MenuManager from "@/components/MenuManager";
import { createClient } from "@/lib/supabase/server";
import { loadCore } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const sb = await createClient();
  const core = await loadCore(sb);
  return <MenuManager menus={core.menus} ings={core.ings} recipes={core.recipes} />;
}
