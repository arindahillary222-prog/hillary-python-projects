import { MatchDetail } from "../../../components/match-detail";
import { upcomingFixtures } from "../../../components/upcoming-fixtures";

export const dynamicParams = false;

export function generateStaticParams() {
  return upcomingFixtures.map((fixture) => ({ fixtureId: fixture.id }));
}

export default async function FixturePage({ params }: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId } = await params;
  return <MatchDetail fixtureId={fixtureId} />;
}
