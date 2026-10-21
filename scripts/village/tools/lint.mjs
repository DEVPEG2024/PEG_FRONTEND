// Vérifie qu'un sprite respecte le contrat du village.
//   node tools/lint.mjs buildings/<id>.svg   (ou plusieurs fichiers)
// Code de sortie 1 si une règle est violée.
import { readFileSync, existsSync, statSync } from 'node:fs';

let failed = false;
for (const f of process.argv.slice(2)) {
  const s = readFileSync(f, 'utf8');
  const errs = [];
  if (!/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="400" height="400" viewBox="0 0 400 400">/.test(s)) errs.push('en-tête <svg> différent de celui de svgDoc() (400×400, viewBox 0 0 400 400)');
  for (const bad of ['<style', '<script', '<foreignObject', '<image', '<filter', 'filter=', 'xlink:href', 'href=', '<animate', '<set', '@import', 'url(http', 'font-face', 'mask=', 'clip-path=']) {
    if (s.includes(bad)) errs.push(`interdit : ${bad}`);
  }
  const size = statSync(f).size;
  if (size > 70000) errs.push(`trop lourd : ${size} octets (max 70 000)`);
  const ids = [...s.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((v, i) => ids.indexOf(v) !== i);
  if (dup.length) errs.push('identifiants en double : ' + [...new Set(dup)].join(', '));
  for (const m of s.matchAll(/url\(#([^)]+)\)/g)) if (!ids.includes(m[1])) errs.push(`url(#${m[1]}) sans définition`);
  const nums = [...s.matchAll(/(?<=[ ML,"])(-?\d+(?:\.\d+)?)(?= |,|"|L|Z|A|$)/g)].map((m) => Number(m[1]));
  if (nums.some((n) => n < -5 || n > 405)) errs.push('des coordonnées sortent de la toile (−5…405)');
  const man = f.replace(/\.svg$/, '.json');
  if (!existsSync(man)) errs.push('manifeste .json absent');
  else {
    const j = JSON.parse(readFileSync(man, 'utf8'));
    for (const k of ['id', 'title', 'labelY', 'hit']) if (j[k] == null) errs.push(`manifeste : champ ${k} manquant`);
    if (j.labelY != null && (j.labelY < 10 || j.labelY > 300)) errs.push('manifeste : labelY hors 10…300');
    if (j.hit && (j.hit.x < 0 || j.hit.y < 0 || j.hit.x + j.hit.w > 400 || j.hit.y + j.hit.h > 400)) errs.push('manifeste : hit sort de la toile');
  }
  if (errs.length) { failed = true; console.log(`✗ ${f}\n  - ${errs.join('\n  - ')}`); }
  else console.log(`✓ ${f} (${size} o)`);
}
process.exit(failed ? 1 : 0);
