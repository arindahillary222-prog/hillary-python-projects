from __future__ import annotations

import argparse
import asyncio
from datetime import UTC, datetime

from app.ingestion.quality import duplicate_keys
from app.providers.statsbomb import StatsBombOpenDataProvider
from app.storage.statsbomb import StatsBombRepository


async def import_competition(competition_id: int, season_id: int, repository: StatsBombRepository | None = None) -> dict[str, int]:
    provider = StatsBombOpenDataProvider()
    matches = await provider.matches(competition_id, season_id)
    match_ids = [str(match["match_id"]) for match in matches if "match_id" in match]
    duplicates = duplicate_keys(match_ids)
    if duplicates:
        raise ValueError(f"StatsBomb duplicate match ids: {sorted(duplicates)}")
    persisted = repository.upsert_matches(matches) if repository else 0
    return {"competition_id": competition_id, "season_id": season_id, "matches_fetched": len(matches), "matches_persisted": persisted, "imported_at": int(datetime.now(UTC).timestamp())}


def main() -> None:
    parser = argparse.ArgumentParser(description="Import an official StatsBomb Open Data competition season.")
    parser.add_argument("--competition-id", required=True, type=int)
    parser.add_argument("--season-id", required=True, type=int)
    parser.add_argument("--database-url", help="Server-side PostgreSQL connection string. Required with --persist.")
    parser.add_argument("--persist", action="store_true", help="Write validated records to the migrated PostgreSQL database.")
    args = parser.parse_args()
    if args.persist and not args.database_url:
        parser.error("--database-url is required when --persist is selected.")
    repository = StatsBombRepository(args.database_url) if args.persist else None
    print(asyncio.run(import_competition(args.competition_id, args.season_id, repository)))


if __name__ == "__main__":
    main()
