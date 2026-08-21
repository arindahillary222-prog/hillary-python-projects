import { type FixtureIdentity } from "./fixture-identity";

export type Decision = "QUALIFIED" | "WATCH" | "NO_BET";

export type Fixture = {
  id: string;
  competition: string;
  kickoff_at: string;
  home_team: string;
  away_team: string;
  venue: string;
  status: string;
  demo: boolean;
  identity: FixtureIdentity;
  data_health: { status: "GREEN" | "AMBER" | "RED"; completeness: number; freshness: number; source: string; updated_at: string };
  prediction: {
    market: string;
    selection: string;
    probability: number;
    football_model_probability?: number;
    market_probability?: number;
    final_calibrated_probability?: number;
    conservative_probability?: number;
    market_residual?: number;
    devig_method_dispersion?: number;
    fair_odds: number;
    uncertainty_low: number;
    uncertainty_high: number;
    reliability: number;
    agreement: number;
    decision: Decision;
    reasons: string[];
    model_version: string;
  };
};

type ScheduledFixture = Pick<Fixture, "id" | "kickoff_at" | "home_team" | "away_team" | "venue">;

const schedule: ScheduledFixture[] = [
  { id: "demo-hul-mun", kickoff_at: "2026-08-22T11:30:00Z", home_team: "Hull City", away_team: "Manchester United", venue: "MKM Stadium" },
  { id: "demo-ips-sun", kickoff_at: "2026-08-22T14:00:00Z", home_team: "Ipswich Town", away_team: "Sunderland", venue: "Portman Road" },
  { id: "demo-eve-cry", kickoff_at: "2026-08-22T14:00:00Z", home_team: "Everton", away_team: "Crystal Palace", venue: "Hill Dickinson Stadium" },
  { id: "demo-nfo-lee", kickoff_at: "2026-08-22T14:00:00Z", home_team: "Nottingham Forest", away_team: "Leeds United", venue: "City Ground" },
  { id: "demo-bre-tot", kickoff_at: "2026-08-22T16:30:00Z", home_team: "Brentford", away_team: "Tottenham Hotspur", venue: "Gtech Community Stadium" },
  { id: "demo-mci-bou", kickoff_at: "2026-08-23T13:00:00Z", home_team: "Manchester City", away_team: "AFC Bournemouth", venue: "Etihad Stadium" },
  { id: "demo-bha-ava", kickoff_at: "2026-08-23T13:00:00Z", home_team: "Brighton & Hove Albion", away_team: "Aston Villa", venue: "American Express Stadium" },
  { id: "demo-new-liv", kickoff_at: "2026-08-23T15:30:00Z", home_team: "Newcastle United", away_team: "Liverpool", venue: "St. James' Park" },
  { id: "demo-ful-che", kickoff_at: "2026-08-24T19:00:00Z", home_team: "Fulham", away_team: "Chelsea", venue: "Craven Cottage" },
];

export const upcomingFixtures: Fixture[] = schedule.map((fixture) => ({
  ...fixture,
  competition: "England · upcoming schedule",
  status: "SCHEDULED",
  demo: true,
  identity: {
    arawee_fixture_id: fixture.id,
    kickoff_at: fixture.kickoff_at,
  },
  data_health: {
    status: "AMBER",
    completeness: 72,
    freshness: 100,
    source: "SCHEDULED · curated public release",
    updated_at: "2026-08-21T00:00:00Z",
  },
  prediction: {
    market: "1X2",
    selection: fixture.home_team,
    probability: 0.5,
    football_model_probability: 0.5,
    market_probability: undefined,
    final_calibrated_probability: 0.5,
    conservative_probability: 0.4,
    market_residual: 0,
    devig_method_dispersion: undefined,
    fair_odds: 2,
    uncertainty_low: 0.4,
    uncertainty_high: 0.6,
    reliability: 60,
    agreement: 0,
    decision: "WATCH",
    reasons: ["WATCH_DATA", "WATCH_LINEUP", "WATCH_PRICE"],
    model_version: "schedule-preview-v0.1",
  },
}));

export function fixtureById(fixtureId: string) {
  return upcomingFixtures.find((fixture) => fixture.id === fixtureId) ?? upcomingFixtures[0];
}
