/**
 * @jest-environment jsdom
 */
/**
 * Tests — détection des erreurs de chunk périmé (après un déploiement).
 *
 * Incident du 24/09/2026 : « Cannot read properties of undefined (reading 'default') » affiché
 * aux clients au lieu d'un rechargement automatique. Le garde de version appelait
 * `event.preventDefault()` sur `vite:preloadError`, ce qui fait résoudre l'import dynamique à
 * `undefined` ; ce message n'étant pas reconnu, l'ErrorBoundary restait affiché.
 */

import { isChunkLoadError, MAX_STALE_RELOADS } from '@/utils/chunkLoadError';
import * as fs from 'fs';
import * as path from 'path';

describe('isChunkLoadError', () => {
  it.each([
    // Chrome / Edge
    'Failed to fetch dynamically imported module: https://app.mypeg.fr/assets/MyFiles-abc123.js',
    // Safari (iPhone, iPad, Mac)
    'Importing a module script failed.',
    // Firefox
    'error loading dynamically imported module: https://app.mypeg.fr/assets/x.js',
    // CSS du chunk
    'Unable to preload CSS for /assets/index-abc.css',
    // Import résolu à undefined → React.lazy lit .default sur rien (Chrome puis Safari)
    "Cannot read properties of undefined (reading 'default')",
    "undefined is not an object (evaluating 'n.default')",
  ])('reconnaît « %s »', (message) => {
    expect(isChunkLoadError(new Error(message))).toBe(true);
  });

  it('reconnaît une ChunkLoadError par son nom', () => {
    const err = new Error('x');
    err.name = 'ChunkLoadError';
    expect(isChunkLoadError(err)).toBe(true);
  });

  it.each([
    "Cannot read properties of undefined (reading 'name')",
    'Network Error',
    'boom test',
  ])('ignore une erreur applicative ordinaire « %s »', (message) => {
    expect(isChunkLoadError(new Error(message))).toBe(false);
  });

  it('ne plante pas sur une valeur vide', () => {
    expect(isChunkLoadError(undefined)).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});

describe('garde de version', () => {
  it("n'appelle jamais preventDefault sur vite:preloadError (l'import deviendrait undefined)", () => {
    const src = fs.readFileSync(path.join(__dirname, '../utils/appVersionGuard.ts'), 'utf8');
    const code = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toMatch(/preventDefault/);
  });
});

/**
 * Incident du 24/09/2026 (2) : « Failed to fetch dynamically imported module … ModernLayout ».
 * Chaque appelant avait son anti-boucle « une fois par 30 s » : un second échec rapproché
 * laissait l'écran d'erreur affiché.
 */
describe('rechargement après build périmé', () => {
  const reloadMock = jest.fn();
  const originalLocation = window.location;

  beforeEach(() => {
    jest.resetModules();
    sessionStorage.clear();
    reloadMock.mockClear();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadMock },
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  const freshModule = () => require('@/utils/chunkLoadError') as typeof import('@/utils/chunkLoadError');

  it('une même panne signalée par plusieurs appelants ne recharge (et ne compte) qu\'une fois', () => {
    const { reloadForStaleBuild } = freshModule();
    expect(reloadForStaleBuild()).toBe(true);
    expect(reloadForStaleBuild()).toBe(true);
    expect(reloadForStaleBuild()).toBe(true);
    expect(reloadMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(sessionStorage.getItem('peg_stale_build_reloads') || '[]')).toHaveLength(1);
  });

  it('recharge encore après un premier rechargement récent (plus de blocage à 30 s)', () => {
    freshModule().reloadForStaleBuild(); // page 1
    jest.resetModules();
    expect(freshModule().reloadForStaleBuild()).toBe(true); // page 2, quelques secondes après
    expect(reloadMock).toHaveBeenCalledTimes(2);
  });

  it('s\'arrête au plafond pour ne jamais boucler', () => {
    for (let i = 0; i < MAX_STALE_RELOADS; i++) {
      jest.resetModules();
      expect(freshModule().reloadForStaleBuild()).toBe(true);
    }
    jest.resetModules();
    expect(freshModule().reloadForStaleBuild()).toBe(false);
    expect(reloadMock).toHaveBeenCalledTimes(MAX_STALE_RELOADS);
  });

  it('un seul garde : aucun anti-boucle local dans les appelants', () => {
    for (const f of ['../utils/appVersionGuard.ts', '../utils/lazyWithRetry.ts', '../components/ErrorBoundary.tsx']) {
      const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
      expect(src).toMatch(/reloadForStaleBuild/);
      expect(src).not.toMatch(/chunk-reload-|peg_version_reload_ts/);
    }
  });
});

describe('fichiers /assets/ après un déploiement', () => {
  const root = path.join(__dirname, '../..');

  it("la réécriture SPA n'avale pas /assets/ (un chunk absent = 404, pas index.html en 200)", () => {
    const cfg = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
    const spa = cfg.rewrites.find((r: { destination: string }) => r.destination === '/');
    expect(spa.source).toBe('/((?!assets/).*)');
  });

  it('le service worker ne met jamais de HTML en cache sous /assets/', () => {
    const sw = fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8');
    expect(sw).toMatch(/!type\.includes\('text\/html'\)/);
  });

  it('le build de production republie les chunks de la version précédente', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(pkg.scripts.build).toMatch(/node scripts\/keep-previous-assets\.mjs/);
  });
});
