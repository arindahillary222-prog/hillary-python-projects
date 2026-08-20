from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable


class EntityResolutionError(ValueError):
    pass


@dataclass(frozen=True)
class EntityAlias:
    provider: str
    provider_entity_id: str
    canonical_id: str
    label: str


class EntityResolver:
    """Resolve only persisted provider IDs/approved aliases—never fuzzy-name match silently."""

    def __init__(self, aliases: Iterable[EntityAlias] = ()) -> None:
        self._by_provider_id: dict[tuple[str, str], EntityAlias] = {}
        self._by_normalised_label: dict[str, set[str]] = {}
        for alias in aliases:
            self.register(alias)

    def register(self, alias: EntityAlias) -> None:
        key = (alias.provider.casefold(), alias.provider_entity_id)
        previous = self._by_provider_id.get(key)
        if previous and previous.canonical_id != alias.canonical_id:
            raise EntityResolutionError("Provider entity ID maps to conflicting canonical IDs.")
        self._by_provider_id[key] = alias
        label = self._normalise(alias.label)
        self._by_normalised_label.setdefault(label, set()).add(alias.canonical_id)

    def resolve(self, provider: str, provider_entity_id: str) -> str:
        try:
            return self._by_provider_id[(provider.casefold(), provider_entity_id)].canonical_id
        except KeyError as error:
            raise EntityResolutionError("Unknown provider entity: create an approved mapping first.") from error

    def resolve_label(self, label: str) -> str:
        matches = self._by_normalised_label.get(self._normalise(label), set())
        if len(matches) != 1:
            raise EntityResolutionError("Name resolution is ambiguous or unapproved; provider ID mapping is required.")
        return next(iter(matches))

    @staticmethod
    def _normalise(value: str) -> str:
        return " ".join(value.casefold().replace(".", "").split())
