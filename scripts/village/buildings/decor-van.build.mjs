// Décor « Camionnette » : camionnette blanche à bande violette qui roule vers le bas-droite.
// Objet centré sur l'ancre monde (0, 0) = point (200, 300) de la toile 400 × 400.
//   node buildings/decor-van.build.mjs && node tools/lint.mjs buildings/decor-van.svg
import { writeFileSync } from 'node:fs';
import { svgDoc } from '../tools/iso.mjs';
import { van, manifest } from '../tools/props.mjs';

const id = 'decor-van', title = 'Camionnette';
const it = van(0, 0, { facing: 'x' });
writeFileSync(new URL(`./${id}.svg`, import.meta.url), svgDoc({ title, body: it.svg }));
writeFileSync(new URL(`./${id}.json`, import.meta.url), JSON.stringify(manifest(id, title, it.box), null, 2) + '\n');
console.log(`ok buildings/${id}.svg`);
