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

import {
  failedChunk,
  isChunkLoadError,
  MAX_STALE_RELOADS,
  STALE_RELOAD_BACKOFF_MS,
} from '@/utils/chunkLoadError';
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
    jest.useFakeTimers();
    jest.resetModules();
    sessionStorage.clear();
    reloadMock.mockClear();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadMock },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
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

  it('recharge encore après un premier rechargement récent (plus de blocage à 30 s)', async () => {
    freshModule().reloadForStaleBuild(); // page 1 : tout de suite
    expect(reloadMock).toHaveBeenCalledTimes(1);
    jest.resetModules();
    expect(freshModule().reloadForStaleBuild()).toBe(true); // page 2, quelques secondes après
    await jest.advanceTimersByTimeAsync(STALE_RELOAD_BACKOFF_MS[1]);
    expect(reloadMock).toHaveBeenCalledTimes(2);
  });

  it('s\'arrête au plafond pour ne jamais boucler', async () => {
    for (let i = 0; i < MAX_STALE_RELOADS; i++) {
      jest.resetModules();
      expect(freshModule().reloadForStaleBuild()).toBe(true);
      await jest.advanceTimersByTimeAsync(STALE_RELOAD_BACKOFF_MS[i]);
    }
    jest.resetModules();
    expect(freshModule().reloadForStaleBuild()).toBe(false);
    expect(reloadMock).toHaveBeenCalledTimes(MAX_STALE_RELOADS);
  });

  /**
   * Incident du 22/10/2026 : pendant une mise en ligne, la nouvelle version réclame parfois des
   * fichiers que le CDN ne sert pas encore, pendant une minute environ. Trois rechargements
   * immédiats tombaient tous dans cette minute → « Connexion instable ».
   */
  it("les rechargements s'espacent et couvrent la minute d'une mise en ligne", async () => {
    expect(STALE_RELOAD_BACKOFF_MS[0]).toBe(0);
    expect(STALE_RELOAD_BACKOFF_MS).toHaveLength(MAX_STALE_RELOADS);
    const span = STALE_RELOAD_BACKOFF_MS.reduce((a, b) => a + b, 0);
    expect(span).toBeGreaterThanOrEqual(55_000);

    freshModule().reloadForStaleBuild();
    expect(reloadMock).toHaveBeenCalledTimes(1);
    jest.resetModules();
    freshModule().reloadForStaleBuild();
    await jest.advanceTimersByTimeAsync(STALE_RELOAD_BACKOFF_MS[1] - 1);
    expect(reloadMock).toHaveBeenCalledTimes(1); // pas encore : on laisse le CDN finir
    await jest.advanceTimersByTimeAsync(1);
    expect(reloadMock).toHaveBeenCalledTimes(2);
  });

  /**
   * Incident du 22/10/2026 (2) : « Connexion instable » persistant dans un Chrome alors qu'un
   * navigateur neuf chargeait tout. Dès le deuxième essai, et sur « Réessayer », on repart d'un
   * cache propre : service worker désinscrit, caches de l'application vidés.
   */
  describe('cache de l\'application vidé quand un rechargement ne suffit pas', () => {
    const unregister = jest.fn(async () => true);
    const del = jest.fn(async () => true);
    beforeEach(() => {
      unregister.mockClear();
      del.mockClear();
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: { getRegistrations: async () => [{ unregister }] },
      });
      (globalThis as unknown as { caches: unknown }).caches = {
        keys: async () => ['peg-v1-assets', 'peg-v2-assets'],
        delete: del,
      };
    });
    afterEach(() => {
      delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;
      delete (globalThis as unknown as { caches?: unknown }).caches;
    });

    it('le premier rechargement garde le cache, le suivant le vide avant de recharger', async () => {
      freshModule().reloadForStaleBuild();
      await jest.advanceTimersByTimeAsync(0);
      expect(unregister).not.toHaveBeenCalled();
      expect(reloadMock).toHaveBeenCalledTimes(1);
      jest.resetModules();
      freshModule().reloadForStaleBuild();
      await jest.advanceTimersByTimeAsync(STALE_RELOAD_BACKOFF_MS[1]);
      expect(unregister).toHaveBeenCalledTimes(1);
      expect(del).toHaveBeenCalledTimes(2);
      expect(reloadMock).toHaveBeenCalledTimes(2);
    });

    it('« Réessayer » : nouvelle série de rechargements, cache vidé', async () => {
      const mod = freshModule();
      for (let i = 0; i < MAX_STALE_RELOADS; i++) {
        jest.resetModules();
        freshModule().reloadForStaleBuild();
        await jest.advanceTimersByTimeAsync(STALE_RELOAD_BACKOFF_MS[i]);
      }
      jest.resetModules();
      expect(freshModule().reloadForStaleBuild()).toBe(false); // plafond
      mod.resetStaleReloads();
      await mod.clearAppCaches();
      expect(del).toHaveBeenCalledWith('peg-v2-assets');
      jest.resetModules();
      expect(freshModule().reloadForStaleBuild()).toBe(true); // de nouveau permis
    });

    it('sans service worker ni caches (navigateur ancien, navigation privée), rien ne casse', async () => {
      delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;
      delete (globalThis as unknown as { caches?: unknown }).caches;
      await expect(freshModule().clearAppCaches()).resolves.toBeUndefined();
    });
  });

  it("l'écran d'erreur nomme le fichier qui n'a pas pu se charger", () => {
    expect(
      failedChunk(
        new Error(
          'Failed to fetch dynamically imported module: https://app.mypeg.fr/assets/PegDistricts-BXweT1gB.js'
        )
      )
    ).toBe('PegDistricts-BXweT1gB.js');
    expect(failedChunk(new Error('Unable to preload CSS for /assets/index-W9B2SryK.css'))).toBe(
      'index-W9B2SryK.css'
    );
    expect(failedChunk(new Error('Importing a module script failed.'))).toBeNull();
    expect(failedChunk(null)).toBeNull();
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
