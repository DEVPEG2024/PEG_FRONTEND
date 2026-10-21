// Régénère les sprites du Village PEG (accueil admin) et les publie dans le front.
//   node scripts/village/export.mjs
// 1. exécute buildings/*.build.mjs, extra/build.mjs et extra/*.build.mjs (chaque SVG s'écrit à côté
//    de son script, avec un manifeste JSON : haut du toit et cadre cliquable) ;
// 2. contrôle chaque SVG (tools/lint.mjs : en-tête 400 × 400, ni style, ni script,
//    ni image externe, ≤ 70 Ko, coordonnées dans la toile) ;
// 3. copie dans public/img/village les sprites cités par villageScene.ts ;
// 4. écrit spriteManifest.json pour les bâtiments de la scène.
// Ensuite : incrémenter SPRITES_VERSION dans villageScene.ts (fichiers servis
// sans empreinte), puis `npx jest src/__tests__/adminVillage`.
//
// Géométrie commune (tools/iso.mjs) : toile 400 × 400, ancre au sol (200, 300),
// projection isométrique à 30°, face +y éclairée, face +x ombrée. Accessoires
// partagés (personnages, arbres, bancs, camionnettes…) : tools/props.mjs.
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const PUBLIC = resolve(ROOT, 'public/img/village');
const VILLAGE = resolve(ROOT, 'src/views/app/admin/home/village');
const SCENE = resolve(VILLAGE, 'villageScene.ts');
const MANIFEST = resolve(VILLAGE, 'spriteManifest.json');

const inDir = (dir, ext) =>
  readdirSync(resolve(HERE, dir))
    .filter((f) => f.endsWith(ext))
    .map((f) => resolve(HERE, dir, f));

for (const script of [...inDir('buildings', '.build.mjs'), resolve(HERE, 'extra/build.mjs'), ...inDir('extra', '.build.mjs')])
  execFileSync(process.execPath, [script], { stdio: 'inherit' });

const svgs = [...inDir('buildings', '.svg'), ...inDir('extra', '.svg')];
execFileSync(process.execPath, [resolve(HERE, 'tools/lint.mjs'), ...svgs], { stdio: 'inherit' });

const scene = readFileSync(SCENE, 'utf8');
const byName = new Map(svgs.map((p) => [p.split('/').pop().replace(/\.svg$/, ''), p]));
const used = [...new Set([...scene.matchAll(/'([a-z][a-z-]*)'/g)].map((m) => m[1]))].filter(
  (n) => byName.has(n)
);
mkdirSync(PUBLIC, { recursive: true });
for (const f of readdirSync(PUBLIC)) if (f.endsWith('.svg')) rmSync(resolve(PUBLIC, f));
for (const n of used) copyFileSync(byName.get(n), resolve(PUBLIC, `${n}.svg`));

const ids = [...scene.matchAll(/id: '([a-z]+)',\s*u:/g)].map((m) => m[1]);
const manifest = Object.fromEntries(
  ids.map((id) => {
    const m = JSON.parse(readFileSync(resolve(HERE, 'buildings', `${id}.json`), 'utf8'));
    return [id, { labelY: m.labelY, hit: m.hit }];
  })
);
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Village : ${used.length} sprites publiés, ${ids.length} bâtiments au manifeste.`);
