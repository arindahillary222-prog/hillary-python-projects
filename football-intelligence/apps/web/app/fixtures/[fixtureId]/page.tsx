import { MatchDetail } from "../../../components/match-detail";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ fixtureId: "demo-ars-che" }];
}

export default async function FixturePage({ params }: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId } = await params;
  return <MatchDetail fixtureId={fixtureId} />;
}
