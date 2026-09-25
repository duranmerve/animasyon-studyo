// Tiny static server for dist/ (local checks only).
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg', '.png': 'image/png' };
export function serve(port = 0) {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
      if (!p.startsWith(ROOT) || !fs.existsSync(p)) { rsp.writeHead(404); rsp.end(); return; }
      const data = fs.readFileSync(p), type = TYPES[path.extname(p)] || 'application/octet-stream';
      const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
      if (range) {
        const a = +range[1] || 0, b = range[2] ? +range[2] : data.length - 1;
        rsp.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${a}-${b}/${data.length}`, 'Accept-Ranges': 'bytes', 'Content-Length': b - a + 1 });
        rsp.end(data.subarray(a, b + 1));
      } else { rsp.writeHead(200, { 'Content-Type': type, 'Content-Length': data.length, 'Accept-Ranges': 'bytes' }); rsp.end(data); }
    });
    srv.listen(port, () => res(srv));
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) serve(Number(process.argv[2]) || 5178).then(s => console.log('http://localhost:' + s.address().port));
