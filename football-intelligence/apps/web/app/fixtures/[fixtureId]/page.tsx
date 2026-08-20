import { MatchDetail } from "../../../components/match-detail";

export default async function FixturePage({ params }: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId } = await params;
  return <MatchDetail fixtureId={fixtureId} />;
}
