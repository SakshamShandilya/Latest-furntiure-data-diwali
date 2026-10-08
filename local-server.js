const http = require('http');
const fs = require('fs');
const path = require('path');
const { scanCatalogs } = require('./scan-catalogs');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff'
};

const server = http.createServer((req, res) => {
  // Add CORS headers for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);

  // API Endpoint: Trigger re-scan of catalogs
  if (pathname === '/api/rescan' && req.method === 'POST') {
    try {
      const catalogs = scanCatalogs();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, count: catalogs.length, catalogs }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API Endpoint: Save a newly uploaded JSON to disk in <category>/<brand>/<file>.json
  if (pathname === '/api/save-catalog' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { category, brand, fileName, data } = payload;

        if (!category || !brand || !data) {
          throw new Error('Missing category, brand, or data in request');
        }

        const safeCategory = category.replace(/[^a-zA-Z0-9_-]/g, '');
        const safeBrand = brand.replace(/[^a-zA-Z0-9_-]/g, '');
        const cleanFileName = (fileName || `${safeBrand.toLowerCase()}_${safeCategory.toLowerCase()}.json`).replace(/[^a-zA-Z0-9_.-]/g, '');

        const targetDir = path.join(ROOT_DIR, safeCategory, safeBrand);
        fs.mkdirSync(targetDir, { recursive: true });

        const targetFile = path.join(targetDir, cleanFileName);
        fs.writeFileSync(targetFile, JSON.stringify(data, null, 2), 'utf8');

        // Rescan and update manifests
        const updatedCatalogs = scanCatalogs();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          savedPath: `${safeCategory}/${safeBrand}/${cleanFileName}`,
          catalogs: updatedCatalogs
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Static file serving
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.join(ROOT_DIR, pathname);

  // Security: prevent directory traversal
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 Not Found: ${pathname}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Moderna Atelier Furniture PLP Server running at:`);
  console.log(` http://localhost:${PORT}`);
  console.log(`====================================================`);
});
