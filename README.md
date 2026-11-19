# Nightwood

A medieval survival and building game you play in your browser.

**Play free:** https://nightwood.akshatjamwal.workers.dev

You start alone at the edge of a dark forest. By day you chop, mine, craft and build a home of your own; by night monsters come for your fire. Rescue settlers, grow a village, explore the kingdom, and face raids and great beasts, alone or with up to 3 friends.

## Features

- Survive day and night: build by day, defend your fire at night
- Gather and craft: chop, mine and forage, then craft your tools and weapons
- Build anywhere: your house, walls, towers and farms, wherever you choose
- Grow a village: rescue settlers and give them jobs
- Explore a big world: towns, shops, horses and different lands
- Fight raids and bosses
- Online co-op for up to 4 players
- Free in the browser, no download

## Project layout

| Path | What it is |
|---|---|
| `index.html` | The whole game: a single file, three.js |
| `music/`, `sfx/`, `keyart/`, `art/` | Recorded music, ambience loops, key art and sprite sources |
| `server/` | Cloudflare Worker: serves the game and relays co-op rooms (`rooms.js`) |
| `docs/GDD.md` | Game design doc |
| `tools/` | Small asset scripts |

## Run it locally

```
node server/dev.mjs
```

Then open http://localhost:8787. Add `?test` to the address to run the built-in self-checks (see the console).

## Deploy

```
cd server
node build.mjs
npx wrangler deploy
```

`build.mjs` copies the game into `server/public`, and Wrangler uploads it to Cloudflare.
