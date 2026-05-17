const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = '0.0.0.0';
const PUBLIC_ENV_KEYS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_POSTER_ADMIN_CODE'];

function loadDotEnvFile(fileName) {
  const envPath = path.join(__dirname, fileName);
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (process.env[key] !== undefined) continue;

    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function getPublicEnvScript() {
  const publicEnv = Object.fromEntries(PUBLIC_ENV_KEYS.map((key) => [key, process.env[key] || '']));
  return `window.__POSTER_ENV__ = ${JSON.stringify(publicEnv)};`;
}

loadDotEnvFile('.env');
loadDotEnvFile('.env.example');

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf'
};

const CACHEABLE_EXTS = new Set(['.png','.jpg','.jpeg','.gif','.svg','.ico','.webp','.woff','.woff2','.ttf','.otf']);

// ── PDF export via Puppeteer ─────────────────────────────────────────────────
async function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (e) { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

async function handlePdfExport(req, res) {
  const { html, filename } = await readRequestBody(req);

  if (!html) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Missing html field in request body');
    return;
  }

  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch {
    res.writeHead(503, { 'Content-Type': 'text/plain' });
    res.end('Puppeteer is not installed. Run: npm install');
    return;
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none'
    ]
  });

  try {
    const page = await browser.newPage();

    // A4 at 96 dpi: 210mm = 793.7px ≈ 794px, 297mm = 1122.5px ≈ 1123px
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    await page.emulateMediaType('print');

    await page.setContent(html, {
      waitUntil: ['domcontentloaded', 'networkidle2'],
      timeout: 30000
    });

    // Extra settle time for fonts and layout
    await new Promise(r => setTimeout(r, 800));

    const pdfBuffer = await page.pdf({
      width: '210mm',
      height: '297mm',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });

    const safeName = (filename || 'poster.pdf')
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      'Content-Length': Buffer.byteLength(pdfBuffer),
      'Cache-Control': 'no-store'
    });
    res.end(pdfBuffer);
  } finally {
    await browser.close();
  }
}

// ── HTTP server ──────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const requestPath = req.url.split('?')[0];

  // Health-check — confirms the Node server is alive at this origin
  if (requestPath === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ ok: true, server: 'node', version: process.version }));
    return;
  }

  // PDF export endpoint
  if (requestPath === '/api/export-pdf' && req.method === 'POST') {
    handlePdfExport(req, res).catch(err => {
      console.error('[PDF] Export failed:', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('PDF export error: ' + err.message);
      }
    });
    return;
  }

  // Env injection
  if (requestPath === '/env.js' || requestPath === '/poster-builder/env.js') {
    res.writeHead(200, {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(getPublicEnvScript());
    return;
  }

  // Static file serving
  let filePath = '.' + requestPath;

  if (filePath.endsWith('/')) {
    filePath += 'index.html';
  } else if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath += '/index.html';
  } else if (filePath === './') {
    filePath = './index.html';
  }

  const extname = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  if (CACHEABLE_EXTS.has(extname)) {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  } else {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File Not Found</h1>');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}/`);
});
