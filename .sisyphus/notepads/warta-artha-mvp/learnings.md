## 2026-03-25
- Preserving the static design language works best by reusing the emerald palette, Manrope + Inter pairing, soft layered cards, and glassy bottom navigation in a componentized React shell.
- For rupiah inputs, storing numeric state and rendering formatted display with `Intl.NumberFormat("id-ID")` keeps calculations reliable while matching Indonesian UX expectations.
- Dexie + `useLiveQuery` gives a simple offline-first source of truth for Home and Report pages without introducing sync complexity in MVP.
- Receipt OCR line-item parsing is more stable when each candidate line requires a trailing price token, then filters out payment/summary terms (`subtotal`, `ppn`, `kembalian`) before building editable items.
- Auto-category suggestion can remain deterministic and explainable by scoring merchant text and parsed item names against curated Indonesian keyword maps to existing category IDs.

## 2026-03-31
- Desktop responsiveness improves significantly by widening shell constraints while still capping form content (`.page-stack` and `.form-card`) to preserve readability.
- For scan item editing on mobile, switching row layout to a two-column stack avoids horizontal squeeze without removing inline quantity/amount controls.
- Web Speech API can stay robust in production by mapping native recognition errors (`not-allowed`, `audio-capture`, `no-speech`) to explicit Indonesian guidance and preserving manual edit fallback.
- Dexie migration to add `accounts` plus `transactions.accountId/accountLabel` can stay safe for existing users by bumping schema version and seeding default records in `upgrade` only when account table is empty.
- Making account selector required in both manual and scan forms works reliably with a disabled placeholder option and auto-select of first seeded account when data loads.
- Backward compatibility for legacy transactions is simplest with layered account label resolution: prefer live account map, then persisted `accountLabel`, then final fallback `Tanpa akun`.
