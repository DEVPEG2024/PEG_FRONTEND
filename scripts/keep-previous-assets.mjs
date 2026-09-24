#!/usr/bin/env node
/**
 * keep-previous-assets — « skew protection » maison pour Vercel (compte gratuit, sans la
 * protection native).
 *
 * Problème : chaque déploiement ne sert QUE ses propres fichiers /assets/*. Un onglet ouvert sur
 * la version précédente réclame ses chunks hachés (ex. ModernLayout-AbC123.js) → introuvables →
 * « Failed to fetch dynamically imported module ». Incident du 24/09/2026.
 *
 * Solution : après `vite build`, on récupère depuis le site EN LIGNE tous les fichiers /assets/
 * de la version actuellement servie (parcours à partir de index.html : un chunk référence les
 * autres par leur nom) et on les ajoute au nouveau build. Un historique (assets-history.json)
 * reconduit aussi les versions plus anciennes pendant RETENTION_DAYS.
 *
 * Les noms sont hachés sur le contenu : un fichier récupéré ne peut jamais écraser un fichier
 * du nouveau build (on ne copie que les absents).
 *
 * NE FAIT JAMAIS ÉCHOUER LE BUILD : toute erreur est journalisée, le déploiement continue.
 *
 * Actif uniquement en production Vercel (VERCEL_ENV=production) ou si PEG_PREVIOUS_ORIGIN est
 * défini (test local : PEG_PREVIOUS_ORIGIN=https://app.mypeg.fr node scripts/keep-previous-assets.mjs).
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const ORIGIN = (process.env.PEG_PREVIOUS_ORIGIN || 'https://app.mypeg.fr').replace(/\/$/, '');
const ENABLED = process.env.VERCEL_ENV === 'production' || !!process.env.PEG_PREVIOUS_ORIGIN;
const RETENTION_DAYS = 14;
const HISTORY_FILE = 'assets-history.json';
const MAX_FILES = 3000;
const CONCURRENCY = 8;
const REQUEST_TIMEOUT_MS = 15_000;
const TOTAL_BUDGET_MS = 120_000;

// Dossiers de sortie : dist (Vite) et, s'il existe, la sortie Build Output API de
// vite-plugin-vercel (copiée depuis dist pendant le build, donc AVANT ce script).
const OUTPUT_DIRS = ['dist', '.vercel/output/static'];

// Fichier d'asset Vite : nom simple, sans chemin.
const ASSET_NAME = '[A-Za-z0-9_.-]+\\.(?:js|css|woff2?|ttf|eot|png|jpe?g|gif|svg|webp|avif|ico|json|wasm)';
const ABS_REF_RE = new RegExp(`/?assets/(${ASSET_NAME})`, 'g');
// Import relatif entre chunks : import("./Foo-abc.js") / from"./vendor-x.js"
const REL_REF_RE = new RegExp(`["'\`]\\./(${ASSET_NAME})["'\`]`, 'g');

const started = Date.now();
const log = (...a) => console.log('[keep-previous-assets]', ...a);

async function fetchWithTimeout(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: ctrl.signal, headers: { 'Cache-Control': 'no-cache' } });
  } finally {
    clearTimeout(timer);
  }
}

/** Télécharge un asset ; null s'il est absent ou si la réponse est la coque HTML (réécriture SPA). */
async function fetchAsset(name) {
  const res = await fetchWithTimeout(`${ORIGIN}/assets/${name}`);
  if (!res.ok) return null;
  const type = res.headers.get('content-type') || '';
  if (type.includes('text/html')) return null;
  return Buffer.from(await res.arrayBuffer());
}

function collectRefs(text, into) {
  for (const m of text.matchAll(ABS_REF_RE)) into.add(m[1]);
  for (const m of text.matchAll(REL_REF_RE)) into.add(m[1]);
}

async function existingOutputDirs() {
  const dirs = [];
  for (const d of OUTPUT_DIRS) {
    try {
      if ((await fs.stat(d)).isDirectory()) dirs.push(d);
    } catch {
      /* absent */
    }
  }
  return dirs;
}

async function listLocalAssets(dir) {
  try {
    return new Set(await fs.readdir(path.join(dir, 'assets')));
  } catch {
    return new Set();
  }
}

async function main() {
  if (!ENABLED) {
    log(`ignoré (VERCEL_ENV=${process.env.VERCEL_ENV ?? 'non défini'})`);
    return;
  }
  const outDirs = await existingOutputDirs();
  if (!outDirs.length) {
    log('aucun dossier de sortie trouvé, ignoré');
    return;
  }
  const local = await listLocalAssets(outDirs[0]);
  const now = Date.now();

  // 1) Point de départ : la version en ligne (index.html) + l'historique qu'elle publie.
  const queue = new Set();
  const indexRes = await fetchWithTimeout(`${ORIGIN}/`);
  if (!indexRes.ok) throw new Error(`index.html en ligne : HTTP ${indexRes.status}`);
  collectRefs(await indexRes.text(), queue);

  /** @type {Record<string, number>} nom de fichier → dernière fois vu en ligne (ms) */
  let history = {};
  try {
    const res = await fetchWithTimeout(`${ORIGIN}/${HISTORY_FILE}`);
    const type = res.headers.get('content-type') || '';
    if (res.ok && !type.includes('text/html')) {
      const data = await res.json();
      if (data && typeof data.files === 'object') history = data.files;
    }
  } catch {
    /* premier passage : pas encore d'historique */
  }
  const cutoff = now - RETENTION_DAYS * 86_400_000;
  const carried = Object.entries(history)
    .filter(([name, seen]) => typeof seen === 'number' && seen >= cutoff && new RegExp(`^${ASSET_NAME}$`).test(name))
    .map(([name]) => name);

  // 2) Parcours du graphe de la version en ligne : chaque JS/CSS référence les suivants.
  const liveFiles = new Set();
  const fetched = new Map(); // nom → contenu (pour ne télécharger qu'une fois)
  const pending = [...queue];
  const seen = new Set(pending);
  while (pending.length && liveFiles.size < MAX_FILES && Date.now() - started < TOTAL_BUDGET_MS) {
    const batch = pending.splice(0, CONCURRENCY);
    await Promise.all(
      batch.map(async (name) => {
        try {
          const buf = await fetchAsset(name);
          if (!buf) return;
          liveFiles.add(name);
          fetched.set(name, buf);
          if (/\.(js|css)$/.test(name)) {
            const refs = new Set();
            collectRefs(buf.toString('utf8'), refs);
            for (const r of refs) {
              if (!seen.has(r)) {
                seen.add(r);
                pending.push(r);
              }
            }
          }
        } catch {
          /* fichier injoignable : ignoré */
        }
      })
    );
  }

  // 3) Versions plus anciennes reconduites par l'historique (encore servies par le site en ligne).
  const olderToFetch = carried.filter((n) => !liveFiles.has(n) && !local.has(n));
  for (let i = 0; i < olderToFetch.length && Date.now() - started < TOTAL_BUDGET_MS; i += CONCURRENCY) {
    await Promise.all(
      olderToFetch.slice(i, i + CONCURRENCY).map(async (name) => {
        try {
          const buf = await fetchAsset(name);
          if (buf) fetched.set(name, buf);
        } catch {
          /* ignoré */
        }
      })
    );
  }

  // 4) Écriture des seuls fichiers absents du nouveau build.
  let added = 0;
  let bytes = 0;
  for (const [name, buf] of fetched) {
    if (local.has(name)) continue;
    for (const dir of outDirs) {
      await fs.mkdir(path.join(dir, 'assets'), { recursive: true });
      await fs.writeFile(path.join(dir, 'assets', name), buf);
    }
    added++;
    bytes += buf.length;
  }

  // 5) Nouvel historique : fichiers du nouveau build + ceux de la version en ligne = vus maintenant ;
  //    anciens reconduits = date d'origine conservée (expirent après RETENTION_DAYS).
  const nextHistory = {};
  for (const name of carried) if (fetched.has(name) || local.has(name)) nextHistory[name] = history[name];
  for (const name of liveFiles) nextHistory[name] = now;
  for (const name of local) nextHistory[name] = now;
  const payload = JSON.stringify({ generatedAt: new Date(now).toISOString(), retentionDays: RETENTION_DAYS, files: nextHistory });
  for (const dir of outDirs) await fs.writeFile(path.join(dir, HISTORY_FILE), payload);

  log(
    `${added} fichier(s) conservé(s) des versions précédentes (${(bytes / 1024 / 1024).toFixed(1)} Mo) ; ` +
      `version en ligne : ${liveFiles.size} fichier(s) ; historique : ${Object.keys(nextHistory).length} ; ` +
      `${((Date.now() - started) / 1000).toFixed(1)} s ; sorties : ${outDirs.join(', ')}`
  );
}

main().catch((err) => {
  // Jamais bloquant : sans ce filet, les anciens onglets se rechargent (garde de version).
  log('ÉCHEC (non bloquant) :', err?.message || err);
});
