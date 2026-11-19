// Picks CC0 clips, trims and compresses them. One-shots are inlined into index.html (base64) so the game works from a plain file;
// ambience loops go to sfx/*.mp3 and stream through <audio>. usage: node sfx.js <extractedDir> <gameDir>
const { execFileSync } = require('child_process'), fs = require('fs'), path = require('path');
const [X, G] = process.argv.slice(2);
const find = name => { const hit = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f === name) hit.push(p); } })(X); if (!hit.length) throw new Error('missing ' + name); return hit[0]; };
const enc = (src, out, { max = 1.4, mono = true, q = 6, trim = true, fade = .08 } = {}) => {
  const af = [trim ? 'silenceremove=start_periods=1:start_threshold=-48dB' : null, `afade=t=out:st=${Math.max(0, max - fade)}:d=${fade}`, 'loudnorm=I=-18:TP=-2:LRA=11'].filter(Boolean).join(',');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-t', String(max), '-af', af, '-ac', mono ? '1' : '2', '-ar', '44100', '-c:a', 'libmp3lame', '-q:a', String(q), out]);
};
const ONE = { // game name: [source files, max seconds]
  swing: [['swish-1.wav', 'swish-2.wav', 'swish-3.wav', 'swish-4.wav'], .6], heavySwing: [['swing.wav', 'swing2.wav', 'swing3.wav'], .8],
  grunt: [['3grunt1.wav', '3grunt2.wav', '3grunt3.wav', '3grunt4.wav'], .7], yell: [['1yell1.wav', '1yell2.wav', '1yell3.wav'], 1], hurt: [['3grunt5.wav', '3grunt6.wav'], .7],
  clang: [['metal-small1.wav', 'metal-small2.wav', 'metal-small3.wav'], .7], anvil: [['metal-ringing.wav'], 1.6], unsheathe: [['sword-unsheathe.wav', 'sword-unsheathe2.wav'], .9],
  cloth: [['cloth.wav', 'cloth-heavy.wav'], .6], armor: [['chainmail1.wav', 'armor-light.wav'], .8], coin: [['coin.wav', 'coin2.wav'], .7], door: [['door.wav'], 1.2], knock: [['wood-small.wav'], .5], bottle: [['bottle.wav'], .8], beads: [['beads.wav'], .7],
  ghoul: [['mnstr1.wav', 'mnstr2.wav', 'mnstr3.wav', 'mnstr4.wav'], 1.1], ghoulDie: [['shade1.wav', 'shade2.wav'], 1.2], lurker: [['slime1.wav', 'slime2.wav', 'slime3.wav'], .9], wolf: [['wolfman.wav', 'barking_01.ogg', 'barking_02.ogg'], 1.1], howl: [['howl.ogg'], 3], bite: [['bite-small.wav', 'bite-small2.wav'], .5],
  roar: [['giant1.wav', 'giant2.wav', 'giant3.wav', 'roar_01.ogg', 'roar_02.ogg'], 2.2], boss: [['giant4.wav', 'giant5.wav', 'troll_01.ogg', 'troll_02.ogg'], 1.6], snore: [['snore.ogg'], 2.5],
  splash: [['splash_01.ogg', 'splash_02.ogg', 'splash_03.ogg', 'splash_04.ogg'], 1], bubble: [['bubble_01.ogg', 'bubble_02.ogg', 'bubble.wav'], .6], slime: [['slime_01.ogg', 'slime_02.ogg'], .7],
  frog: [['frog.wav'], .5], bird: [['bird.wav', 'bird2.wav'], 1.3], owl: [['birdNight.wav'], 1], cricket: [['cricket.wav'], .4],
  cute: [['cute_01.ogg', 'cute_02.ogg', 'cute_03.ogg', 'cute_04.ogg', 'cute_05.ogg'], .8], eat: [['eat_01.ogg', 'eat_02.ogg', 'eat_03.ogg'], .8], burp: [['burp_01.ogg', 'burp.wav'], 1], ooh: [['ooh.ogg'], 1], spell: [['magic1.wav', 'spell.wav'], 1.4],
  stepGrass: [['Fantozzi-SandL1.ogg', 'Fantozzi-SandR1.ogg', 'Fantozzi-SandL2.ogg', 'Fantozzi-SandR2.ogg'], .35], stepStone: [['Fantozzi-StoneL1.ogg', 'Fantozzi-StoneR1.ogg', 'Fantozzi-StoneL2.ogg', 'Fantozzi-StoneR2.ogg'], .35],
  stepSnow: [['Corsica_S-Walking_on_snow_covered_gravel_01.flac', 'Corsica_S-Walking_on_snow_covered_gravel_03.flac', 'Corsica_S-Walking_on_snow_covered_gravel_05.flac', 'Corsica_S-Walking_on_snow_covered_gravel_07.flac'], .4],
  click: [['interface1.wav', 'interface2.wav'], .4],
};
const LOOP = { rain: ['3.ogg', 45, false], night: ['crickets_1.mp3', 11.4, true], wind: ['Wind.ogg', 6.5, true], swamp: ['swamp.ogg', 60, true], stream: ['water_flowing.ogg', 30, false] }; // name: [source, seconds, mono]
const tmp = path.join(path.dirname(X), 'enc'); fs.mkdirSync(tmp, { recursive: true }); fs.mkdirSync(path.join(G, 'sfx'), { recursive: true });
const SFXDATA = {}; let bytes = 0;
for (const [k, [files, max]] of Object.entries(ONE)) SFXDATA[k] = files.map((f, i) => { const out = path.join(tmp, `${k}${i}.mp3`); enc(find(f), out, { max }); const b = fs.readFileSync(out); bytes += b.length; return b.toString('base64'); });
for (const [k, [f, secs, mono]] of Object.entries(LOOP)) enc(find(f), path.join(G, 'sfx', k + '.mp3'), { max: secs, mono, q: 6, trim: false, fade: .01 });
const htmlPath = path.join(G, 'index.html'), html = fs.readFileSync(htmlPath, 'utf8'), re = /\/\*SFX\*\/[\s\S]*?\/\*ENDSFX\*\//;
if (!re.test(html)) throw new Error('SFX marker not found');
fs.writeFileSync(htmlPath, html.replace(re, () => '/*SFX*/' + JSON.stringify(SFXDATA) + '/*ENDSFX*/'));
console.log('one-shots', Object.keys(ONE).length, 'clips', Object.values(SFXDATA).flat().length, (bytes / 1024 | 0) + ' KB;', 'loops:', fs.readdirSync(path.join(G, 'sfx')).map(f => f + ' ' + (fs.statSync(path.join(G, 'sfx', f)).size / 1024 | 0) + 'KB').join(', '));
