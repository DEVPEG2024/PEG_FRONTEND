// Vie des rues : passants (aller + retour, chacun dans la bonne orientation), coursier, famille,
// groupe qui discute, bancs occupés, livraison sur palette, massifs, plantes, camionnette vers +y.
// Objets centrés sur l'ancre monde (0, 0) = point (200, 300) de la toile 400 × 400.
//   node extra/build.mjs && node tools/lint.mjs extra/*.svg
import { writeFileSync } from 'node:fs';
import { svgDoc } from '../tools/iso.mjs';
import { person, bench, pallet, crate, flowerBed, pottedPlant, van, manifest, bounds } from '../tools/props.mjs';

const out = (id, title, parts) => {
  const body = [...parts].sort((a, b) => a.d - b.d).map((p) => p.svg).join('');
  writeFileSync(new URL(`./${id}.svg`, import.meta.url), svgDoc({ title, body }));
  writeFileSync(new URL(`./${id}.json`, import.meta.url), JSON.stringify(manifest(id, title, bounds(body)), null, 2) + '\n');
};
// Marche le long de x : aller « right » (+x), retour « back-left » (−x).
// Marche le long de y : aller « left » (+y), retour « back-right » (−y).
const walkPair = (id, title, axis, folk) => {
  const [goF, backF] = axis === 'x' ? ['right', 'back-left'] : ['left', 'back-right'];
  for (const [suffix, facing] of [['go', goF], ['back', backF]]) {
    out(`${id}-${suffix}`, title, folk.map((p) => person(p.x ?? 0, p.y ?? 0, { ...p.o, facing, pose: 'walk' })));
  }
};
walkPair('walk-pair', 'Deux passants', 'x', [
  { y: -5, o: { top: '#0ea5e9', hair: '#2b1d14' } },
  { y: 5, o: { top: '#ef8aa0', hairStyle: 'long', hair: '#6b3f1d' } },
]);
walkPair('walk-family', 'Parent et enfant', 'x', [
  { y: -4, o: { top: '#14b8a6', hair: '#3b2a20' } },
  { y: 5, o: { top: '#f6c95c', scale: 0.66, hair: '#a0522d', hairStyle: 'short' } },
]);
walkPair('walk-red', 'Passante', 'x', [{ o: { top: '#ef4444', skin: '#c98f6a', hair: '#1f1712', hairStyle: 'bun' } }]);
walkPair('walk-green', 'Passant', 'x', [{ o: { top: '#16a34a', skin: '#e8b58f', hair: '#d4a24c' } }]);
walkPair('walk-amber', 'Passante', 'y', [{ o: { top: '#f59e0b', hairStyle: 'bun', hair: '#3b2a20' } }]);
walkPair('walk-teal', 'Passante', 'y', [{ o: { top: '#0d9488', hairStyle: 'long', hair: '#a0522d' } }]);
walkPair('walk-violet', 'Passant', 'y', [{ o: { top: '#7c6bff', skin: '#c98f6a', hair: '#1f1712' } }]);

// Coursier qui porte un carton (vers +x) et passant pressé vers +y : allers simples.
out('walk-courier', 'Coursier', [
  person(0, 0, { facing: 'right', pose: 'walk', top: '#f97316', hair: '#2b1d14' }),
  { ...crate(3.6, 0, 11.5, { size: 8, h: 6.5 }), d: 3.6 + 0.5 },
]);
out('walk-navy', 'Passant', [person(0, 0, { facing: 'left', pose: 'walk', top: '#34427e', hair: '#6b3f1d' })]);
out('van-y', 'Camionnette', [van(0, 0, { facing: 'y' })]);

// Scènes immobiles.
out('group-chat', 'Groupe qui discute', [
  person(-9, -3, { facing: 'right', top: '#7c6bff', hair: '#2b1d14' }),
  person(8, -5, { facing: 'back-left', top: '#f59e0b', hairStyle: 'bun' }),
  person(0, 9, { facing: 'back-right', pose: 'wave', top: '#0ea5e9', skin: '#c98f6a', hair: '#1f1712' }),
]);
out('bench-x', 'Banc occupé', [bench(0, 0, { axis: 'x', back: true, sitters: [{ at: -4, top: '#7c6bff' }, { at: 4.5, top: '#ef8aa0', hairStyle: 'long', hair: '#6b3f1d' }] })]);
out('bench-y', 'Banc occupé', [bench(0, 0, { axis: 'y', back: true, sitters: [{ at: 1, top: '#14b8a6', hair: '#3b2a20' }] })]);
out('waver', 'Passante qui salue', [person(0, 0, { facing: 'left', pose: 'wave', top: '#ef8aa0', hairStyle: 'long', hair: '#3b2a20' })]);
out('delivery', 'Livraison', [
  pallet(0, -4, { load: 'crates', axis: 'x' }),
  person(2, 12, { facing: 'back-right', top: '#f97316', hair: '#2b1d14' }),
]);
out('flowers-x', 'Massif fleuri', [flowerBed(0, 0, 26, 11, { seed: 3 })]);
out('flowers-y', 'Massif fleuri', [flowerBed(0, 0, 11, 26, { seed: 7 })]);
out('pots', 'Plantes en pot', [pottedPlant(-6, 0), pottedPlant(6, 0, { pot: 'square' })]);
console.log('ok');
