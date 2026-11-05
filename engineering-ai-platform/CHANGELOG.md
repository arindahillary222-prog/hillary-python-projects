
## 0.13 — Batch validation and hydraulic-label correction

Blank imported cells are now rejected before numeric conversion in both single-row and batch beam handoff; they can no longer become zero through JavaScript number coercion. The import workspace now calculates every confirmed data row through the deployed beam endpoint and renders a screening result table. The water graphic now distinguishes hydraulic-grade head from residual head above the assumed terminal invert, eliminating the prior misleading HGL endpoint label. Cloud reopen now reports child-query errors and restores calculation history, revision records, file storage paths and saved model-state metadata where available.

Two-account RLS, authenticated cross-device recovery and private-file isolation remain unpassed because no authorized test-account credentials or controlled inboxes are available in this session. No credentials were fabricated and no paid service was activated.
