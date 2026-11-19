// Local test server, no packages needed: serves the game and runs the same relay as the Cloudflare Worker.
// node server/dev.mjs   →  http://localhost:8787 (open it in two windows: one hosts, one joins)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { Room, MAX_MSG } from './rooms.js';

const ROOT = path.resolve(import.meta.dirname, '..'), PORT = +process.env.PORT || 8787, rooms = new Map();
const TYPES = { '.html': 'text/html; charset=utf-8', '.mp3': 'audio/mpeg', '.txt': 'text/plain; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.resolve(ROOT, '.' + p);
  if (!f.startsWith(ROOT + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
});

server.on('upgrade', (req, socket) => {
  const u = new URL(req.url, 'http://x'), m = u.pathname.match(/^\/room\/([A-Z]{4})$/), key = req.headers['sec-websocket-key'];
  if (!m || !key) return socket.destroy();
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  const room = rooms.get(m[1]) || rooms.set(m[1], new Room()).get(m[1]);
  let open = true, buf = Buffer.alloc(0), parts = [];
  const frame = (op, data) => { const n = data.length, h = n < 126 ? Buffer.from([0x80 | op, n]) : n < 65536 ? Buffer.from([0x80 | op, 126, n >> 8, n & 255]) : Buffer.concat([Buffer.from([0x80 | op, 127]), (() => { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(n)); return b; })()]); if (open) socket.write(Buffer.concat([h, data])); };
  const sock = { send: t => frame(1, Buffer.from(t)), close: (c = 1000) => { if (!open) return; const b = Buffer.alloc(2); b.writeUInt16BE(c); frame(8, b); open = false; socket.end(); } };
  const pid = room.open(sock, u.searchParams);
  const bye = () => { open = false; if (pid) room.close(pid); if (!room.peers.size) rooms.delete(m[1]); };
  socket.on('close', bye); socket.on('error', bye);
  socket.on('data', chunk => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) { // one WebSocket frame at a time: FIN/opcode, masked length, mask, payload
      if (buf.length < 2) return;
      const fin = buf[0] & 0x80, op = buf[0] & 15; let len = buf[1] & 127, at = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); at = 4; } else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); at = 10; }
      if (len > MAX_MSG * 4) return socket.destroy();
      if (buf.length < at + 4 + len) return;
      const mask = buf.subarray(at, at + 4), data = Buffer.from(buf.subarray(at + 4, at + 4 + len)); buf = buf.subarray(at + 4 + len);
      for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
      if (op === 8) return sock.close();
      if (op === 9) { frame(10, data); continue; }
      if (op === 1 || op === 0) { parts.push(data); if (fin) { const text = Buffer.concat(parts).toString('utf8'); parts = []; if (pid) room.message(pid, text); } }
    }
  });
});
server.listen(PORT, () => console.log(`Nightwood test server: http://localhost:${PORT}`));
