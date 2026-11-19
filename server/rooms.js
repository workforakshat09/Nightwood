// The relay behind "Play together": one room per 4-letter code. The first player in is the host; the relay only
// passes messages on, stamped with who sent them. Used by the Cloudflare Worker (worker.js) and the local test server (dev.mjs).
export const MAX_PEERS = 4, MAX_MSG = 1 << 20, STALE_MS = 15000; // every game sends a heartbeat each 4 s; 15 s of silence means the tab is gone
export const cleanName = s => String(s || '').replace(/[^\p{L}\p{N} _'-]/gu, '').trim().slice(0, 16) || 'Wanderer';

export class Room {
  constructor() { this.peers = new Map(); this.host = 0; this.n = 0; this.hostKey = ''; }
  // sock: { send(text), close(code, reason) }. Returns the new player's id, or 0 when the room turns them away.
  open(sock, params) {
    this.sweep();
    const wantHost = params.get('host') === '1', name = cleanName(params.get('name')), key = String(params.get('key') || '').slice(0, 64);
    const refuse = m => { sock.send(JSON.stringify({ t: 'err', m })); sock.close(4000, 'refused'); return 0; };
    if (wantHost && this.host && key && key === this.hostKey) this.close(this.host); // the same host is back (a reload, a dropped line): the old room ends and they open it afresh
    if (wantHost && this.host) return refuse('That room code is already in use. Try again.');
    if (!wantHost && !this.host) return refuse('No game with that code. Check it with your host.');
    if (this.peers.size >= MAX_PEERS) return refuse(`That game is full (${MAX_PEERS} players).`);
    const pid = ++this.n; if (wantHost) { this.host = pid; this.hostKey = key; }
    sock.send(JSON.stringify({ t: 'hello', pid, host: this.host, peers: [...this.peers].map(([id, p]) => ({ pid: id, name: p.name })) }));
    this.cast({ t: 'join', pid, name });
    this.peers.set(pid, { sock, name, seen: Date.now() });
    return pid;
  }
  message(pid, text) {
    const p = this.peers.get(pid); if (!p || typeof text !== 'string' || text.length > MAX_MSG) return;
    p.seen = Date.now(); this.sweep();
    let m; try { m = JSON.parse(text); } catch { return; }
    if (!m || typeof m !== 'object' || Array.isArray(m) || m.t === 'ka') return; // a heartbeat goes no further
    const to = m.to; delete m.to; m.from = pid; const out = JSON.stringify(m);
    if (to) this.send(this.peers.get(to), out); else this.cast(out, pid);
  }
  close(pid) {
    if (!this.peers.delete(pid)) return;
    if (pid !== this.host) return this.cast({ t: 'leave', pid });
    this.host = 0; // the host has gone: the room ends for everyone
    for (const p of this.peers.values()) { this.send(p, JSON.stringify({ t: 'end' })); try { p.sock.close(4001, 'host left'); } catch { } }
    this.peers.clear();
  }
  sweep() { // anyone silent too long has gone (a closed tab does not always say goodbye); a vanished host ends the room
    const now = Date.now();
    for (const [id, p] of [...this.peers]) if (now - p.seen > STALE_MS && this.peers.has(id)) { try { p.sock.close(4002, 'timed out'); } catch { } this.close(id); }
  }
  send(p, text) { try { p?.sock.send(text); } catch { } }
  cast(m, except) { const text = typeof m === 'string' ? m : JSON.stringify(m); for (const [id, p] of this.peers) if (id !== except) this.send(p, text); }
}
