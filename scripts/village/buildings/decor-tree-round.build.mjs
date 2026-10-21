// Décor « Arbre rond » : arbre rond en nuage.
// Objet centré sur l'ancre monde (0, 0) = point (200, 300) de la toile 400 × 400.
//   node buildings/decor-tree-round.build.mjs && node tools/lint.mjs buildings/decor-tree-round.svg
import { writeFileSync } from 'node:fs';
import { svgDoc } from '../tools/iso.mjs';
import { treeRound, manifest } from '../tools/props.mjs';

const id = 'decor-tree-round', title = 'Arbre rond';
const it = treeRound(0, 0);
writeFileSync(new URL(`./${id}.svg`, import.meta.url), svgDoc({ title, body: it.svg }));
writeFileSync(new URL(`./${id}.json`, import.meta.url), JSON.stringify(manifest(id, title, it.box), null, 2) + '\n');
console.log(`ok buildings/${id}.svg`);
