const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const BASE_DIR = __dirname;
const DATA_DIR = path.join(BASE_DIR, 'data');
const FOTOS_DIR = path.join(BASE_DIR, 'fotos');
const CATALOGO_FILE = path.join(DATA_DIR, 'catalogo.json');

// Asegurar que existan las carpetas de datos y fotos
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(FOTOS_DIR)) fs.mkdirSync(FOTOS_DIR, { recursive: true });

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon'
};

function sendJSON(res, status, obj) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // 1. API: Obtener catálogo guardado en este PC
  if (req.method === 'GET' && pathname === '/api/catalog') {
    if (fs.existsSync(CATALOGO_FILE)) {
      try {
        const raw = fs.readFileSync(CATALOGO_FILE, 'utf8');
        return sendJSON(res, 200, JSON.parse(raw));
      } catch (e) {
        return sendJSON(res, 500, { error: 'Error al leer catálogo local' });
      }
    } else {
      return sendJSON(res, 200, { items: [], excelHeaders: [], rawExcelAOA: [] });
    }
  }

  // 2. API: Guardar catálogo en este PC
  if (req.method === 'POST' && pathname === '/api/catalog') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        fs.writeFileSync(CATALOGO_FILE, JSON.stringify(data, null, 2), 'utf8');
        console.log(`[BD Local] Catálogo guardado con éxito: ${data.items ? data.items.length : 0} productos.`);
        return sendJSON(res, 200, { ok: true, count: data.items ? data.items.length : 0 });
      } catch (e) {
        console.error('[BD Local] Error guardando catálogo:', e);
        return sendJSON(res, 400, { error: 'JSON inválido' });
      }
    });
    return;
  }

  // 3. API: Subir foto individual en Base64 al disco duro de este PC
  if (req.method === 'POST' && pathname === '/api/upload-photo') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { filename, base64 } = JSON.parse(body);
        if (!filename || !base64) return sendJSON(res, 400, { error: 'filename y base64 requeridos' });
        
        const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');
        const safeName = path.basename(filename);
        const targetPath = path.join(FOTOS_DIR, safeName);
        fs.writeFileSync(targetPath, buffer);
        console.log(`[Foto Guardada] ${safeName} (${(buffer.length / 1024).toFixed(1)} KB)`);
        return sendJSON(res, 200, { ok: true, url: `/fotos/${encodeURIComponent(safeName)}` });
      } catch (e) {
        console.error('[Foto Error]:', e);
        return sendJSON(res, 500, { error: e.message });
      }
    });
    return;
  }

  // 4. Servir fotos desde la carpeta fotos/
  if (req.method === 'GET' && pathname.startsWith('/fotos/')) {
    const filename = path.basename(pathname);
    const filePath = path.join(FOTOS_DIR, filename);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
      });
      return fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      return res.end('Foto no encontrada');
    }
  }

  // 5. Servir archivos estáticos (index.html, etc.)
  let filePath = path.join(BASE_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    return res.end('Archivo no encontrado');
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    'Access-Control-Allow-Origin': '*'
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log('==================================================');
  console.log(`🚀 Servidor y Base de Datos corriendo en:`);
  console.log(`👉 Local: http://localhost:${PORT}`);
  console.log(`📁 Carpeta de datos: ${DATA_DIR}`);
  console.log(`🖼️ Carpeta de fotos: ${FOTOS_DIR}`);
  console.log('==================================================');
});