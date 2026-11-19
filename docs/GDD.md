# Nightwood

**One line:** a medieval survival game seen from above. By day you fell, mine, farm and build at the edge of a dark forest. By night the dead come for your fire, and something very large walks out of the trees.

**Player fantasy:** the lone settler who turns a clearing into a walled homestead, then a village under their banner.
**Platform:** desktop browser, keyboard and mouse or a standard gamepad. Single file (`index.html`), three.js r0.160, WebGL 2.
**Audience:** players of cosy-but-tense survival builders; sessions of 20–60 minutes.

## Pillars

1. **Day builds, night tests.** Everything you make by day is judged by the next night.
2. **Readable danger.** Every big attack is telegraphed (a ring, a lit lane, a wind-up) and can be dodged.
3. **A living valley.** Settlers, villages and a market town go about their day around you.

## Core loop

Gather (axe, pick, shovel, bucket) → craft at the table (Q) → build walls, torches, traps, a home → survive the night at your fire → wake to more people, better tools and a farther walk outwards.

## Key numbers

| | Value | Source |
|---|---|---|
| Day length | 600 s real time (`CYCLE`) | `index.html` |
| World | 1000 × 1000 units, explored on a 4-unit map grid | `WORLD`, `MAPN` |
| Full belly lasts | 1.5 days; warning at 25 %; starving wears you down to 15 % health, never to death | `updatePlayer` |
| Fire burn | 200 s of fuel per 600 s at night, a quarter of that by day; rain triples it unless roofed; a log adds 60 s. A new game has no fire: you choose where to build it (Q → Home, 3 logs + 2 stone, dry open ground clear of trees and buildings), lit with 150 s; folk feed it, cook and idle by it wherever it stands | `save.fire`, `save.hearth`, `save.hearthAt`, `fireOk` |
| First wall | 5 logs, on cleared ground | `LEVELS.wall` |
| Starting purse | 25 coins, 4 logs, 2 stone | `save.inventory`, `newSave` |
| First tools | axe 2 logs + 1 stone · pickaxe 2 + 1 · shovel 3 + 1 · sword 2 + 3 · bucket 4 logs | `TOOL_COST` |
| House | 20 logs, 8 × 6, placed on x even / z odd so its walls sit on the build grid | `LEVELS.house`, `houseOk` |
| Night spawns | up to 3 + 2 × day foes (max 14) | `updateEnemies` |

## Feature index

| Feature | Status | Notes |
|---|---|---|
| Gathering and tools | implemented | you start with none: make the axe, pickaxe, shovel, sword and bucket at the crafting table (Gear & tools), once each, kept for good; steel upgrades at the workshop |
| Building | implemented | walls, gates, towers, traps, torches, homestead pieces; snap to the house. G switches one piece / a line / a box: drag corner to corner, every piece checked and paid as if placed alone |
| Menus | implemented | oak frame with iron nails round parchment, carved wooden buttons (crafting table, pause, settings, profiles, co-op, guide card); main page: logo and a three-tab board (Play · Profiles · Together) over the key art |
| Settler paths | implemented | A* on 1-unit squares round walls and through gates; when the way is shut nearby, a wider search takes in your fences, walls and gates within 130 and finds the gate, however far round. Sealed yards: the job is dropped (retried each dawn). Land checks are remembered per square, and the ground round home is learned in the background at load |
| Home and settlers | implemented | you build the house where you choose (Q → Home); six levels. All four settlers start stranded in the wilds and only come home once there is a free bed: none on the ground floor, four upstairs from level 3, two per cottage and tower |
| Day / night, weather | implemented | dusk sunbeams, lit windows, rain, fog, snow on the ridge |
| Combat | implemented | light/heavy, block and parry, dodge roll with a 0.18 s input buffer, fire bolt, water splash |
| Foes and AI | implemented | notice delay 0.4 s by day, give-up range ×1.4, crowds spread out |
| Great foes | implemented | The Antlered One, Rimefang, Ragnar the Bandit King, The Drowned Matron, The Wight King |
| Villages and Kingsford | implemented | shops, stables, tavern hires, farm stock |
| Horses | implemented | buy, whistle, ride, stable |
| First-day guide | implemented | a sealed letter (three pages, typed out, wax seal) and eleven guided steps; each step pays once per profile (+5 coins and +5 XP; the house +20/+20), and a gold arrow points to the step's target: over it when on screen, at the screen's edge when not (also leads followers home, and to your map waypoint) for a new game (tools one by one, then the house); replay from Pause |
| Music | implemented | composed in code by default (Settings → Music: composed / recorded): day, a 3/4 folk tune in D dorian (lute arpeggios, recorder melody in A A B A phrases, the recorder resting every third section); night, slow A minor drones with sparse harp and distant bells; boss, D minor at 132 with war drums, a string ostinato and brass stabs. Synthesised live with Web Audio, no files; same fades as the recorded tracks (`tickComposer`) |
| Settings | implemented | four volume sliders, interface size, screen shake, soft lightning, key rebinding |
| Gamepad | implemented | standard layout; Y crafting, D-pad ↑ build mode, R3 turns the view; in menus the D-pad moves between cards, LB/RB switch tabs |
| Raids | implemented | from night 3 every third night, from night 9 every other night; announced at dawn; a monster horde, or the Usurper King's army (soldiers, crossbowmen, axemen); up to 32 foes |
| Guard posts | implemented | each post keeps a sword sentry who holds foes within 11 of it; a fallen sentry returns at dawn |
| Building purpose | implemented | standing by any piece shows what it does, with live numbers; pieces can be built over tilled soil |
| Stone across the world | implemented | 480 extra rock outcrops over the plains, lakes and elderwood (`rng(2323)`), so a home built far from the Vale still has stone near |
| Mushrooms | implemented | 300 patches in damp, shady ground (swamp, hollow, under the Vale's trees, the elderwood, lake shores). Pick with any swing for 2; eat raw (F, +9 food) or cook Mushroom stew (3 mushrooms + 1 water = 2 cooked food). Their own dice (`rng(1717)`), so nothing else in the world moved |
| Dropped packs | implemented | dying drops the half of your pack you lose where you fell, for 5 minutes; anyone can pick it up with E (in co-op the host keeps the list) |
| Map | implemented | your house (a gold house, labelled Home on the big map) and your fire are marked; M: the whole Vale, scroll or + / − to zoom up to 8× around you; scroll on the minimap to change its reach; friends and dropped packs show on both |
| Saves | implemented | browser storage, version 1, last good save kept as a backup. Continue puts you at your front door once the house is built, else at the camp. Three profiles, each with its own save and first-day guide (`SLOT`, `slotKey`); "Profiles & new game" on the title screen and in Pause plays one, starts it over or deletes it, each after a confirm; Pause → Main menu saves and returns to the main page. Saves made before profiles existed become profile 1 |
| Play together | implemented | online co-op for up to 4 players. The host's browser runs the world, and friends join with a 4-letter room code. Foes, raids and bosses hit whoever is nearest; friends' hits, builds, chopping and digging go to the host. Only the host's game is saved. The relay is a Cloudflare Worker with one Durable Object per room (`server/`). Dying in co-op keeps the world running: no day reset, back on your feet at home after 8 s. The night passes only when every player is in bed. The Antlered One fights whichever player is nearest in its lair. Each game sends a heartbeat every 4 s; the relay ends a room 15 s after its host goes silent, and the host keeps their room code (and a private key) so they can reopen it at once. Every hero in a room wears their own colours: the host the classic blue and red, friends green and gold, purple and white, or orange and teal (`playerLook`; an outfit overrides it) |

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-11-13 | Hunger alone never kills | Needs that kill feel like chores; the night is the threat |
| 2026-11-13 | Simulation sub-steps at most 1/60 s on slow frames, rendering stays uninterpolated | Stops tunnelling at low frame rates without stutter on 144 Hz screens |
| 2026-11-16 | Co-op: the host's browser runs the world, and each player moves their own hero | The world code assumes one world, so making it lockstep or server-run would mean a rewrite. Moving your own hero locally keeps controls instant |
| 2026-11-16 | Friends' packs are not saved in co-op | A friend's single-player save must never be overwritten by the host's world |
| 2026-11-16 | No house, tools or settlers at the start | Earning each one is the early game; settlers are found and need beds, so growing the village means building homes |
| 2026-11-16 | Mountains never fade; the camera slides in when rock is in the way, and the hero shows as a pale outline behind rock and roofs | The see-through fade let players look inside the hollow peaks |
| 2026-11-16 | The campfire is built by the player, wherever they choose; once built it stays | Choosing where your camp starts is part of making it yours; moving it later is not needed yet |
| 2026-11-16 | Main page: painted key art (`keyart/keyart.jpg`, made with Figma AI) and a scene built from the game's sprites take turns every 14 s | Asked for both |
| 2026-11-16 | Facing the camera or away, swings chop over the top instead of sweeping sideways | A sideways sweep seen from the front looked like a windscreen wiper |
| 2026-11-13 | Keep three.js r0.160 | An upgrade would change lighting and shaders for no player-facing gain right now |

## Checks

Open `index.html?test` and read the console: `self-check done`, `self-check 2 done` and `level check done` must print, with no failed assertions (saves fall back to the backup, foes notice and give up as designed, every landmark is reachable from camp).
