/**
 * Tests unitaires — décodage/validation JWT (jwt.ts).
 *
 * Sécurité : ces fonctions déterminent l'identité (id porté par le token,
 * source d'autorité) et l'expiration de session. Elles doivent être robustes
 * face à un token absent, malformé ou tronqué — jamais planter, toujours
 * échouer côté « fermé » (null / expiré).
 */

import { decodeJwt, getTokenUserId, isTokenExpired } from '@/utils/jwt';

// Encode un objet en segment base64url (comme un vrai JWT).
const b64url = (obj: unknown) =>
  Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

// Fabrique un JWT factice header.payload.signature.
const makeToken = (payload: Record<string, unknown>) =>
  `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.sig`;

describe('decodeJwt', () => {
  test('décode le payload d\'un token valide', () => {
    const token = makeToken({ id: 75, exp: 1893456000 });
    expect(decodeJwt(token)).toMatchObject({ id: 75, exp: 1893456000 });
  });

  test('gère les caractères base64url (- et _)', () => {
    // payload volumineux pour forcer des caractères +// -> -_ dans l'encodage
    const token = makeToken({ id: 1, note: 'aaa???>>>~~~ûüéè', sub: 'x/y+z' });
    const decoded = decodeJwt(token);
    expect(decoded?.sub).toBe('x/y+z');
    expect(decoded?.note).toBe('aaa???>>>~~~ûüéè');
  });

  test('null / undefined / chaîne vide → null', () => {
    expect(decodeJwt(null)).toBeNull();
    expect(decodeJwt(undefined)).toBeNull();
    expect(decodeJwt('')).toBeNull();
  });

  test('token sans segment payload → null', () => {
    expect(decodeJwt('abc')).toBeNull(); // pas de "."
  });

  test('payload non-base64 / non-JSON → null (pas d\'exception)', () => {
    expect(decodeJwt('h.@@@not-base64@@@.s')).toBeNull();
    expect(decodeJwt(`h.${b64url('pas un objet json valide après décodage')}xx.s`)).toBeNull();
  });
});

describe('getTokenUserId — identité portée par le token', () => {
  test('id numérique → number', () => {
    expect(getTokenUserId(makeToken({ id: 75 }))).toBe(75);
  });

  test('id chaîne numérique → converti en number', () => {
    expect(getTokenUserId(makeToken({ id: '42' }))).toBe(42);
  });

  test('id absent → null', () => {
    expect(getTokenUserId(makeToken({ exp: 123 }))).toBeNull();
  });

  test('id non-numérique (documentId Strapi) → null', () => {
    expect(getTokenUserId(makeToken({ id: 'ncgzvxcyahbg' }))).toBeNull();
  });

  test('token illisible → null', () => {
    expect(getTokenUserId('garbage')).toBeNull();
    expect(getTokenUserId(null)).toBeNull();
  });
});

describe('isTokenExpired — échoue côté fermé', () => {
  const now = Math.floor(Date.now() / 1000);

  test('exp dans le futur → non expiré', () => {
    expect(isTokenExpired(makeToken({ id: 1, exp: now + 3600 }))).toBe(false);
  });

  test('exp dans le passé → expiré', () => {
    expect(isTokenExpired(makeToken({ id: 1, exp: now - 3600 }))).toBe(true);
  });

  test('token illisible → considéré expiré (fail-closed)', () => {
    expect(isTokenExpired('garbage')).toBe(true);
    expect(isTokenExpired(null)).toBe(true);
    expect(isTokenExpired(undefined)).toBe(true);
  });

  test('token sans exp → non expiré (pas d\'échéance déclarée)', () => {
    expect(isTokenExpired(makeToken({ id: 1 }))).toBe(false);
  });
});
