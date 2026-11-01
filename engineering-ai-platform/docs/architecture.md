# System Architecture

Release 0.1 uses a thin browser client and a typed FastAPI service. The API exposes health, energy screening, structural screening, and assistant routing endpoints. Deterministic calculations are isolated behind explicit schemas so a future model provider can interpret intent without producing critical numbers.

The planned production architecture is a React/TypeScript client, FastAPI domain services, PostgreSQL/PostGIS metadata, object storage, Redis-backed durable jobs, isolated solver workers, provider-independent AI adapters, and an auditable calculation ledger. Heavy solvers must not execute in a frontend host.
