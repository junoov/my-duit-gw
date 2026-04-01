## 2026-03-25
- Implemented local-first persistence with Dexie IndexedDB and added a cloud sync adapter placeholder so Firebase integration can be activated later via env config.
- Used Vite PWA `generateSW` strategy with runtime caching for Google Fonts and precache for app shell assets to keep the app installable and resilient offline.
- Kept scan flow as editable confirmation flow: OCR auto-fills amount and merchant, then user can adjust before saving to avoid silent extraction errors.
- Split transaction category state between manual input and scan input, so OCR-driven category suggestions do not silently alter manual form choices.
- Persisted receipt `lineItems` only when valid and non-empty to stay backward-compatible with older transaction records that have no itemization fields.

## 2026-03-31
- Kept voice input deterministic via local parser (`voiceCommandParser`) using Indonesian command keywords and number words, explicitly avoiding AI/cloud parsing to keep behavior predictable and offline-friendly.
- Embedded voice controls only in the manual tab so OCR scan workflow and existing transaction save logic remain untouched.
- Chose responsive width strategy that expands shell and content spacing on desktop while preserving existing warm visual language and copy tone on mobile.
- Added dedicated account module split (`src/data/accounts.js`, `src/services/accountService.js`, `src/hooks/useAccounts.js`) so account persistence, defaults, and summary logic stay isolated from transaction UI concerns.
- Kept transaction-account relation denormalized (`accountId` + `accountLabel`) to guarantee detail readability even if account metadata changes or legacy records miss relation fields.
- Introduced `/buku` as lazy route and inserted Buku item in bottom navigation while preserving Home/Tambah/Laporan discoverability for existing usage flow.
