export type FixtureIdentity = {
  arawee_fixture_id: string;
  sportmonks_fixture_id?: string;
  odds_provider_event_id?: string;
  video_provider_fixture_id?: string;
  competition_id?: string;
  home_team_id?: string;
  away_team_id?: string;
  kickoff_at: string;
};

export type ProviderFixtureRef = "sportmonks_fixture_id" | "odds_provider_event_id" | "video_provider_fixture_id";

export function matchesProviderFixture(identity: FixtureIdentity, providerField: ProviderFixtureRef, providerFixtureId: string | number | null | undefined) {
  return Boolean(providerFixtureId) && identity[providerField] === String(providerFixtureId);
}

export function fixtureIdentityIsValid(identity: FixtureIdentity, fixtureId: string) {
  return identity.arawee_fixture_id === fixtureId && Boolean(identity.kickoff_at);
}
