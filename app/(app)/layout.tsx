import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return <Shell email={data.user.email ?? ""}>{children}</Shell>;
}
