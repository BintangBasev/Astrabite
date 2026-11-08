import TvScreen from "@/components/TvScreen";

export const metadata = { title: "Layar TV · AstraBite" };

export default async function TvPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <TvScreen token={token} />;
}
