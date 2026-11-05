
## 0.14 — Batch history persistence and BIM reconstruction foundation

Batch beam results now persist as a project calculation-history set. Local sessions retain every row and result; authenticated sessions upsert the project and save each row through the existing atomic calculation RPC, preserving independent revision/calculation records. Saved BIM primitives now include size, position, category, level and material metadata, and cloud/local reopen reconstructs those components into Three.js primitives rather than only restoring text metadata.

This remains a foundation milestone: live authenticated reopen, two-account isolation, account deletion, and full native PDF/DXF/IFC parsing still require evidence or additional implementation.
