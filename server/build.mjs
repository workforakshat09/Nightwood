// Copies the game (index.html, music/, sfx/, keyart/) into ./public for `npx wrangler deploy`.
import fs from 'node:fs'; import path from 'node:path';
const here = import.meta.dirname, root = path.resolve(here, '..'), out = path.join(here, 'public');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
fs.copyFileSync(path.join(root, 'index.html'), path.join(out, 'index.html'));
for (const d of ['music', 'sfx', 'keyart']) fs.cpSync(path.join(root, d), path.join(out, d), { recursive: true });
console.log('public/ ready:', fs.readdirSync(out).join(', '));
