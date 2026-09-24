/**
 * Tests — détection des erreurs de chunk périmé (après un déploiement).
 *
 * Incident du 24/09/2026 : « Cannot read properties of undefined (reading 'default') » affiché
 * aux clients au lieu d'un rechargement automatique. Le garde de version appelait
 * `event.preventDefault()` sur `vite:preloadError`, ce qui fait résoudre l'import dynamique à
 * `undefined` ; ce message n'étant pas reconnu, l'ErrorBoundary restait affiché.
 */

import { isChunkLoadError } from '@/utils/chunkLoadError';
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
