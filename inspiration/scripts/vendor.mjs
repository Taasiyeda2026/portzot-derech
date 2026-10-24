import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
await mkdir(new URL('vendor/', root), { recursive: true });
for (const [source, target] of [
  ['@supabase/supabase-js/dist/umd/supabase.js', 'supabase.js'],
  ['@supabase/supabase-js/LICENSE', 'SUPABASE-LICENSE'],
  ['pdfjs-dist/build/pdf.min.mjs', 'pdf.mjs'],
  ['pdfjs-dist/build/pdf.worker.min.mjs', 'pdf.worker.mjs'],
  ['pdfjs-dist/LICENSE', 'PDFJS-LICENSE'],
  ['qrcode-generator/dist/qrcode.js', 'qrcode.js'],
]) {
  await copyFile(new URL(`node_modules/${source}`, root), new URL(`vendor/${target}`, root));
}
console.log(`Vendored pinned browser libraries into ${fileURLToPath(new URL('vendor/', root))}`);
