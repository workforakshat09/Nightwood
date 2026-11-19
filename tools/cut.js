// Cuts magenta-keyed sprite sheets into small pixel sprites and inlines them into index.html.
// usage: node cut.js <rawDir> <artOutDir> <index.html>
const { PNG } = require('pngjs'), fs = require('fs'), path = require('path');
const [rawDir, outDir, htmlPath] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });

function load(f, strict) { // strict: for sprites with purple in them, only near-pure magenta is background
  const img = PNG.sync.read(fs.readFileSync(path.join(rawDir, f))), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], b = d[i + 2]; if (strict ? r > 150 && b > 150 && Math.abs(r - b) < 30 && Math.min(r, b) - g > 90 : Math.min(r, b) - g > 70 && Math.abs(r - b) < 70) d[i + 3] = 0; } // key out magenta
  return img;
}
const A = (img, x, y) => img.data[(y * img.width + x) * 4 + 3] > 127;

function segments(img) { // sprites = runs of non-empty columns
  const cols = []; for (let x = 0; x < img.width; x++) { let n = 0; for (let y = 0; y < img.height; y++) if (A(img, x, y)) n++; cols.push(n > 2); }
  const runs = []; let start = -1, gap = 0;
  for (let x = 0; x <= img.width; x++) {
    if (cols[x]) { if (start < 0) start = x; gap = 0; }
    else if (start >= 0 && (++gap > 12 || x === img.width)) { if (x - gap - start > 20) runs.push([start, x - gap + 1]); start = -1; gap = 0; }
  }
  return runs.map(([x0, x1]) => { let y0 = img.height, y1 = 0; for (let y = 0; y < img.height; y++) for (let x = x0; x < x1; x++) if (A(img, x, y)) { y0 = Math.min(y0, y); y1 = Math.max(y1, y + 1); } return { x0, x1, y0, y1 }; });
}
function footX(img, b) { let sx = 0, n = 0; for (let y = Math.floor(b.y1 - (b.y1 - b.y0) * .1); y < b.y1; y++) for (let x = b.x0; x < b.x1; x++) if (A(img, x, y)) { sx += x - b.x0; n++; } return n ? sx / n : (b.x1 - b.x0) / 2; }

function cut(img, boxes, targetH, shared) { // nearest-neighbour shrink; feet centred and on the bottom row
  const ref = shared ? boxes[0].y1 - boxes[0].y0 : Math.max(...boxes.map(b => b.y1 - b.y0)), s = targetH / ref;
  const fr = boxes.map(b => ({ b, w: Math.round((b.x1 - b.x0) * s), h: Math.round((b.y1 - b.y0) * s), fx: footX(img, b) * s }));
  const sharedW = 2 * Math.ceil(Math.max(...fr.map(f => Math.max(f.fx, f.w - f.fx)))), sharedH = Math.max(...fr.map(f => f.h));
  return fr.map(f => {
    const W = shared ? sharedW : 2 * Math.ceil(Math.max(f.fx, f.w - f.fx)), H = shared ? sharedH : f.h, out = new PNG({ width: W, height: H }), ox = Math.round(W / 2 - f.fx), oy = H - f.h;
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
      const sx = Math.min(img.width - 1, Math.floor(f.b.x0 + (x + .5) / s)), sy = Math.min(img.height - 1, Math.floor(f.b.y0 + (y + .5) / s));
      if (!A(img, sx, sy) || x + ox < 0 || x + ox >= W) continue;
      const si = (sy * img.width + sx) * 4, di = ((y + oy) * W + x + ox) * 4;
      out.data[di] = img.data[si]; out.data[di + 1] = img.data[si + 1]; out.data[di + 2] = img.data[si + 2]; out.data[di + 3] = 255;
    }
    return out;
  });
}
const ART = {};
function emit(name, pngs) {
  ART[name] = pngs.map((p, i) => { const buf = PNG.sync.write(p); fs.writeFileSync(path.join(outDir, `${name}${pngs.length > 1 ? i : ''}.png`), buf); return { u: 'data:image/png;base64,' + buf.toString('base64'), w: p.width, h: p.height }; });
  console.log(name, pngs.map(p => `${p.width}x${p.height}`).join(' '));
}
function cutScale(img, boxes, targetH) { // one scale for the whole sheet, so items keep their sizes relative to each other
  const s = targetH / Math.max(...boxes.map(b => b.y1 - b.y0));
  return boxes.map(b => {
    const W = Math.max(1, Math.round((b.x1 - b.x0) * s)), H = Math.max(1, Math.round((b.y1 - b.y0) * s)), out = new PNG({ width: W, height: H });
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const sx = Math.min(img.width - 1, Math.floor(b.x0 + (x + .5) / s)), sy = Math.min(img.height - 1, Math.floor(b.y0 + (y + .5) / s));
      if (!A(img, sx, sy)) continue;
      const si = (sy * img.width + sx) * 4; out.data.set([img.data[si], img.data[si + 1], img.data[si + 2], 255], (y * W + x) * 4);
    }
    return out;
  });
}
function sheet(file, name, n, targetH, shared) {
  const img = load(file), boxes = segments(img);
  if (boxes.length !== n) throw new Error(`${file}: expected ${n} sprites, found ${boxes.length}`);
  const pngs = shared === 'scale' ? cutScale(img, boxes, targetH) : cut(img, boxes, targetH, shared);
  emit(name, pngs); return pngs;
}
// armour tiers: the blue tunic is recoloured, so each upgrade is visible on the knight. Lightness is kept so the shading survives.
function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; if (!d) return [0, 0, l]; const s = d / (1 - Math.abs(2 * l - 1)); const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, s, l]; }
function hsl2rgb(h, s, l) { const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; return [r, g, b].map(v => Math.round(Math.min(1, Math.max(0, v + m)) * 255)); }
const TIERS = [null, null, [30, .55, l => l * .95], [215, .07, l => Math.min(.92, l * 1.12 + .1)]]; // tier 2 reinforced leather (brown), tier 3 stone-plated mail (silver)
function recolor(png, tier) {
  const out = new PNG({ width: png.width, height: png.height }); png.data.copy(out.data);
  const [h2, s2, lf] = TIERS[tier];
  for (let i = 0; i < out.data.length; i += 4) { if (!out.data[i + 3]) continue; const [h, s, l] = rgb2hsl(out.data[i], out.data[i + 1], out.data[i + 2]); if (h > 195 && h < 255 && s > .3 && l > .12) out.data.set(hsl2rgb(h2, s2, lf(l)), i); }
  return out;
}
for (const view of ['side', 'front', 'back']) {
  const base = sheet(`k${view}.png`, `k${view}1`, 4, 44, true); // idle, step A, step B, strike
  for (const t of [2, 3]) emit(`k${view}${t}`, base.map(p => recolor(p, t)));
}
sheet('items.png', 'items', 7, 34, 'scale'); // rusty, stone-forged, fine sword, axe, pickaxe, shovel, bucket
sheet('shields.png', 'shield', 3, 19, true); // wood, leather, steel
sheet('villager.png', 'villager', 4, 40, true); // idle, step A, step B, kneel
sheet('wild.png', 'wild', 6, 14, 'scale'); // frog sit, frog jump, bird up, bird down, fish, butterfly
sheet('lurker.png', 'lurker', 3, 54, true); // shamble A, shamble B, lunge
sheet('wolf.png', 'wolf', 3, 26, true); // run A, run B, leap
sheet('ghoul.png', 'ghoul', 3, 36, true);
sheet('trees.png', 'tree', 4, 126, false);
sheet('animals.png', 'animal', 4, 34, false); // deer stand, deer run, rabbit sit, rabbit hop
{
  const img = load('beast.png'), bs = segments(img), box = { x0: Math.min(...bs.map(b => b.x0)), x1: Math.max(...bs.map(b => b.x1)), y0: Math.min(...bs.map(b => b.y0)), y1: Math.max(...bs.map(b => b.y1)) };
  const [beast] = cut(img, [box], 260, false); emit('beast', [beast]);
  const eyes = new PNG({ width: beast.width, height: beast.height }); // glowing parts only, drawn unlit on top
  for (let i = 0; i < beast.data.length; i += 4) { const r = beast.data[i], g = beast.data[i + 1], b = beast.data[i + 2]; if (beast.data[i + 3] && r > 205 && g > 80 && g < 215 && b < 120 && r - b > 110) { eyes.data.set([r, g, b, 255], i); } }
  emit('eyes', [eyes]);
}
// sheets laid out in rows (side poses on top; front and back below): each row is cut on its own
function rowsOf(img) {
  const on = []; for (let y = 0; y < img.height; y++) { let n = 0; for (let x = 0; x < img.width; x++) if (A(img, x, y)) n++; on.push(n > 2); }
  const bands = []; let s = -1, gap = 0;
  for (let y = 0; y <= img.height; y++) { if (on[y]) { if (s < 0) s = y; gap = 0; } else if (s >= 0 && (++gap > 12 || y === img.height)) { if (y - gap - s > 20) bands.push([s, y - gap + 1]); s = -1; gap = 0; } }
  return bands.map(([y0, y1]) => { const out = new PNG({ width: img.width, height: y1 - y0 }); img.data.copy(out.data, 0, y0 * img.width * 4, y1 * img.width * 4); return out; });
}
function grid(file, names, counts, targetH) {
  const img = load(file), rows = rowsOf(img); if (rows.length !== names.length) throw new Error(`${file}: expected ${names.length} rows, found ${rows.length}`);
  rows.forEach((r, i) => { const boxes = segments(r); if (boxes.length !== counts[i]) throw new Error(`${file} row ${i}: expected ${counts[i]} sprites, found ${boxes.length}`); emit(names[i], cut(r, boxes, targetH, true)); });
}
// townsfolk and settlers: nine different people. s = side [idle, step A, step B, kneel], f = [front idle, front step, back idle, back step]
for (let k = 1; k <= 9; k++) grid(`p${k}.png`, [`npc${k}s`, `npc${k}f`], [4, 4], 40);
grid('horse.png', ['horses', 'horsef'], [5, 4], 48); // s = [stand, walk A, walk B, gallop gathered, gallop stretched], f = [front stand, front trot, back stand, back trot]
{ // Rimefang: stalk, charge, rear and howl; its ice and eyes drawn again unlit, so they burn in the dark
  const img = load('rimefang.png'), cols = []; for (let x = 0; x < img.width; x++) { let n = 0; for (let y = 0; y < img.height; y++) if (A(img, x, y)) n++; cols.push(n); } const valley = (lo, hi) => { let m = lo; for (let x = lo; x < hi; x++) if (cols[x] < cols[m]) m = x; return m; }, cuts = [0, valley(img.width * .25 | 0, img.width * .5 | 0), valley(img.width * .5 | 0, img.width * .78 | 0), img.width], boxes = [0, 1, 2].map(i => { const x0 = cuts[i], x1 = cuts[i + 1]; let a = x1, b = x0, y0 = img.height, y1 = 0; for (let y = 0; y < img.height; y++) for (let x = x0; x < x1; x++) if (A(img, x, y)) { a = Math.min(a, x); b = Math.max(b, x + 1); y0 = Math.min(y0, y); y1 = Math.max(y1, y + 1); } return { x0: a, x1: b, y0, y1 }; }); // its frost mist joins the poses, so the sheet is cut at the thinnest column between them
  const fr = cut(img, boxes, 66, true); emit('rimefang', fr);
  emit('rimeglow', fr.map(p => { const o = new PNG({ width: p.width, height: p.height }); for (let i = 0; i < p.data.length; i += 4) { const r = p.data[i], g = p.data[i + 1], b = p.data[i + 2]; if (p.data[i + 3] && b > 215 && b - r > 45 && g > 150) o.data.set([r, g, b, 255], i); } return o; }));
}
// the other great foes: n poses in a row, split at the thinnest column between them (their effects touch); bright parts drawn again unlit
function valleyBoxes(img, n) {
  const cols = []; for (let x = 0; x < img.width; x++) { let c = 0; for (let y = 0; y < img.height; y++) if (A(img, x, y)) c++; cols.push(c); }
  const cuts = [0]; for (let i = 1; i < n; i++) { const lo = Math.round(img.width * (i - .35) / n), hi = Math.round(img.width * (i + .35) / n); let m = lo; for (let x = lo; x < hi; x++) if (cols[x] < cols[m]) m = x; cuts.push(m); } cuts.push(img.width);
  return cuts.slice(0, -1).map((x0, i) => { const x1 = cuts[i + 1]; let a = x1, b = x0, y0 = img.height, y1 = 0; for (let y = 0; y < img.height; y++) for (let x = x0; x < x1; x++) if (A(img, x, y)) { a = Math.min(a, x); b = Math.max(b, x + 1); y0 = Math.min(y0, y); y1 = Math.max(y1, y + 1); } return { x0: a, x1: b, y0, y1 }; });
}
for (const [id, glow] of [['ragnar', null], ['matron', (r, g, b) => g > 150 && g > r + 40 && b > 110], ['wight', (r, g, b) => b > 170 && r > 120 && g < 140 && b - g > 70]]) {
  const img = load(`${id}.png`, id === 'wight'), fr = cut(img, valleyBoxes(img, 4), 66, true); emit(id, fr);
  if (glow) emit(id + 'glow', fr.map(p => { const o = new PNG({ width: p.width, height: p.height }); for (let i = 0; i < p.data.length; i += 4) if (p.data[i + 3] && glow(p.data[i], p.data[i + 1], p.data[i + 2])) o.data.set([p.data[i], p.data[i + 1], p.data[i + 2], 255], i); return o; }));
}
{ // farm animals for the villages: both rows at one scale, so a hen stays small next to a cow
  const img = load('farm.png'), rows = rowsOf(img), boxes = rows.map(segments); if (rows.length !== 2 || boxes.some(b => b.length !== 4)) throw new Error('farm.png: expected 2 rows of 4');
  const s = 30 / Math.max(...boxes[0].slice(0, 2).map(b => b.y1 - b.y0)); // a cow is 30 pixels tall
  const out = []; rows.forEach((r, ri) => boxes[ri].forEach(b => { const W = Math.max(1, Math.round((b.x1 - b.x0) * s)), H = Math.max(1, Math.round((b.y1 - b.y0) * s)), o = new PNG({ width: W, height: H });
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const sx = Math.min(r.width - 1, Math.floor(b.x0 + (x + .5) / s)), sy = Math.min(r.height - 1, Math.floor(b.y0 + (y + .5) / s)); if (!A(r, sx, sy)) continue; const si = (sy * r.width + sx) * 4; o.data.set([r.data[si], r.data[si + 1], r.data[si + 2], 255], (y * W + x) * 4); }
    out.push(o); }));
  emit('farm', out); // cow stand, cow walk, sheep stand, sheep walk, pig stand, pig walk, hen stand, hen peck
}
const html = fs.readFileSync(htmlPath, 'utf8'), re = /\/\*ART\*\/[\s\S]*?\/\*END\*\//;
if (!re.test(html)) throw new Error('ART marker not found in ' + htmlPath);
fs.writeFileSync(htmlPath, html.replace(re, () => '/*ART*/' + JSON.stringify(ART) + '/*END*/'));
console.log('inlined', Math.round(JSON.stringify(ART).length / 1024) + ' KB');
