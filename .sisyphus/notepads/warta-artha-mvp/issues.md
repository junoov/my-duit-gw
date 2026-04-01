## 2026-03-25
- `lsp_diagnostics` could not run because the environment cannot spawn `typescript-language-server` even after local and global installation attempts.
- Production build succeeds, but bundle size warning remains high due to OCR (`tesseract.js`) and charting (`recharts`) dependencies.
- Current environment also reports missing `biome` for CSS diagnostics, so LSP verification is limited to build-time validation until tooling is available.

## 2026-03-31
- `lsp_diagnostics` is still unavailable in this environment (`typescript-language-server` spawn failure and missing `biome`), so validation relied on successful `npm run build`.
- Build artifact grew with the new lazy-loaded Buku page chunk and modal styles, but compile remains successful with no runtime dependency additions.
