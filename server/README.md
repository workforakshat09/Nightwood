# Nightwood server

One Cloudflare Worker does two jobs: it serves the game, and it runs the relay for **Play together**. Each room code gets its own Durable Object, which passes the players' messages along. The game itself runs in the players' browsers, and the host's browser runs the world.

## Test on your computer

```bash
node server/dev.mjs
```

Open http://localhost:8787 in two browser windows. In the first, choose **Play together → Host a game**. In the second, choose **Play together**, type the 4-letter code, then **Join**. No packages are needed.

## Put it on Cloudflare

You need a free Cloudflare account and Node.js 20 or newer.

```bash
cd server
npx wrangler login
npm run deploy
```

- `wrangler login` opens your browser so you can sign in to Cloudflare. You only do this once.
- `npm run deploy` copies `index.html`, `music/`, `sfx/` and `keyart/` into `server/public/`, then uploads everything. It prints your address, like `https://nightwood.<your-name>.workers.dev`.

Share that address. Your friends open it, and one of them hosts.

After you change the game, run `npm run deploy` again.

## Good to know

- **Cost:** a room only uses Cloudflare while players are connected. Small groups of friends should stay within the free plan's Workers and Durable Objects allowance. Check the current limits on Cloudflare's pricing page.
- **Rooms:** up to 4 players per room. A room ends when the host leaves.
- **Trust:** anyone with the room code can join and build or knock things down in the host's world. Share codes only with friends.
- **Versions:** everyone must load the same version of the game. If they don't, joining says so. Reloading the page fixes it.
