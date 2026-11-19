// Cloudflare Worker: serves the game from ./public and runs one Durable Object per room code as the relay.
import { Room as RoomLogic } from './rooms.js';

export default {
  async fetch(req, env) {
    const m = new URL(req.url).pathname.match(/^\/room\/([A-Z]{4})$/);
    if (!m) return env.ASSETS.fetch(req);
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(req);
  },
};

export class Room {
  constructor() { this.logic = new RoomLogic(); }
  async fetch(req) {
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    const pid = this.logic.open({ send: t => server.send(t), close: (c, r) => server.close(c, r) }, new URL(req.url).searchParams);
    if (pid) {
      server.addEventListener('message', e => this.logic.message(pid, typeof e.data === 'string' ? e.data : ''));
      const bye = () => this.logic.close(pid);
      server.addEventListener('close', bye); server.addEventListener('error', bye);
    }
    return new Response(null, { status: 101, webSocket: client });
  }
}
