// A small static file server for trying VICE FRAME locally.
//
//   node serve.ts            serves app/ at http://localhost:8080
//   node serve.ts --port N   serves it on another port
//
// Node's standard library only. Requests are mapped onto the app/ folder,
// anything that would climb out of it is refused, and every response carries
// the content type a browser needs to run an offline ES-module app.

import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));

const portArg = process.argv.indexOf('--port');
const port = portArg === -1 ? 8080 : Number(process.argv[portArg + 1]) || 8080;

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

async function handle(request, response): Promise<void> {
  let pathname = '/';
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';

  const filePath = resolve(join(appRoot, '.' + pathname));
  if (filePath !== appRoot && !filePath.startsWith(appRoot + sep)) {
    response.writeHead(403).end('forbidden');
    return;
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('directory');
    const body = await readFile(filePath);
    response.writeHead(200, {
      'content-type': CONTENT_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
      'content-length': body.length,
      'cache-control': 'no-store',
    });
    response.end(body);
  } catch {
    response.writeHead(404).end('not found');
  }
}

createServer(handle).listen(port, '127.0.0.1', () => {
  console.log(`VICE FRAME is up: http://localhost:${port}`);
});
