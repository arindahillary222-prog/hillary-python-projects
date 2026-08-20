# Data quality and time safety

Every observation carries provider identity, source event time, ingestion time, update time, confidence, and freshness. A prediction may use an observation only when `event_timestamp <= prediction_timestamp`.

The quality engine calculates:

- completeness: required fixture, team, odds, lineup and injury fields;
- uniqueness: provider/fixture/event and provider/market/timestamp duplicate guards;
- validity: positive odds, valid UTC timestamps and bounded probabilities;
- consistency: cross-provider conflicting kickoff or lineup values;
- freshness: age relative to kickoff and data type;
- source corroboration: official sources are stronger than rumours.

Any critical failure creates a `data_quality_events` row and prevents a high-reliability recommendation.

