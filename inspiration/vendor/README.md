# Browser dependencies

Copied without modification from npm packages pinned in `../package-lock.json`:

- `@supabase/supabase-js` 2.118.0 — `supabase.js`, MIT (`SUPABASE-LICENSE`).
- `pdfjs-dist` 6.4.299 — minified `pdf.mjs` / `pdf.worker.mjs`, Apache 2.0 (`PDFJS-LICENSE`).
- `qrcode-generator` 2.0.4 — `qrcode.js`, MIT (copyright/license header retained).

Run `npm ci && npm run vendor` in `inspiration/` to reproduce these browser assets.
These assets allow the static course module to run without a production bundler
or third-party script CDN. They contain no project-specific secret credentials.
