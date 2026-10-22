/**
 * Tests unitaires — utilitaires transverses :
 *  - permissions (hasRole)
 *  - correspondance de noms insensible aux accents (nameMatch)
 *  - tri naturel des tailles (sizeSort)
 *  - marqueur d'image d'origine encode dans le nom (pegOrigRef)
 *
 * Ces modules ont ete a l'origine de bugs metier reels (categories non
 * trouvees a cause des accents, tailles dans le desordre, conflit de logos),
 * d'ou une couverture explicite.
 */

import { hasRole } from '@/utils/permissions';
import { normalizeName, sameName } from '@/utils/nameMatch';
import { compareSizeNames, sortSelections, sortSizes } from '@/utils/sizeSort';
import {
  parsePegOrigRef,
  stripPegOrigMarker,
  buildPegOrigName,
} from '@/utils/pegOrigRef';
import { User } from '@/@types/user';

const makeUser = (roleName?: string): User =>
  (roleName ? { role: { name: roleName } } : {}) as User;

describe('Permissions — hasRole', () => {
  test('vrai si le role de l\'utilisateur est dans la liste', () => {
    expect(hasRole(makeUser('admin'), ['admin', 'super_admin'])).toBe(true);
  });

  test('faux si le role n\'est pas dans la liste', () => {
    expect(hasRole(makeUser('customer'), ['admin', 'super_admin'])).toBe(false);
  });

  test('faux pour un utilisateur sans role', () => {
    expect(hasRole(makeUser(), ['admin'])).toBe(false);
  });

  test('faux pour un utilisateur null/undefined', () => {
    expect(hasRole(null as any, ['admin'])).toBe(false);
    expect(hasRole(undefined as any, ['admin'])).toBe(false);
  });

  test('faux avec une liste de roles vide', () => {
    expect(hasRole(makeUser('admin'), [])).toBe(false);
  });
});

describe('Correspondance de noms (accents/casse/espaces)', () => {
  test('normalise accents, casse et espaces surnumeraires', () => {
    expect(normalizeName('  Vetement   Haute-Visibilite ')).toBe(
      'vetement haute-visibilite'
    );
    expect(normalizeName('Vêtement Haute-Visibilité')).toBe(
      'vetement haute-visibilite'
    );
  });

  test('chaine vide / null / undefined -> chaine vide', () => {
    expect(normalizeName('')).toBe('');
    expect(normalizeName(null)).toBe('');
    expect(normalizeName(undefined)).toBe('');
  });

  test('sameName rapproche deux libelles equivalents malgre les accents', () => {
    expect(sameName('Vêtement', 'vetement')).toBe(true);
    expect(sameName('  ROUGE ', 'rouge')).toBe(true);
  });

  test('sameName distingue deux libelles differents', () => {
    expect(sameName('Rouge', 'Bleu')).toBe(false);
  });

  test('sameName est faux si l\'un des libelles est vide', () => {
    expect(sameName('', 'rouge')).toBe(false);
    expect(sameName(null, null)).toBe(false);
  });
});

describe('Tri naturel des tailles', () => {
  test('ordonne les tailles lettres XS < S < M < L < XL < XXL', () => {
    const sorted = sortSizes(
      ['XL', 'S', 'XXL', 'M', 'XS', 'L'].map((name) => ({ name }))
    ).map((s) => s.name);
    expect(sorted).toEqual(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
  });

  test('gere les alias 2XL = XXL, 3XL = XXXL', () => {
    // 2XL doit se placer comme XXL (apres XL), 3XL apres.
    expect(compareSizeNames('XL', '2XL')).toBeLessThan(0);
    expect(compareSizeNames('2XL', '3XL')).toBeLessThan(0);
  });

  test('ordonne les pointures numeriques', () => {
    const sorted = sortSizes(
      ['42', '38', '40', '39'].map((name) => ({ name }))
    ).map((s) => s.name);
    expect(sorted).toEqual(['38', '39', '40', '42']);
  });

  test('les tailles lettres passent avant les numeriques', () => {
    const sorted = sortSizes(
      ['40', 'M', '38', 'S'].map((name) => ({ name }))
    ).map((s) => s.name);
    expect(sorted).toEqual(['S', 'M', '38', '40']);
  });

  test('ne mute pas le tableau d\'origine', () => {
    const input = [{ name: 'XL' }, { name: 'S' }];
    const copy = [...input];
    sortSizes(input);
    expect(input).toEqual(copy);
  });

  test('ages enfant dans l\'ordre (PACK ESDL NOEL : 6A avant 10A)', () => {
    const sorted = sortSizes(
      ['10A', '12A', '14A', '6A', '8A'].map((name) => ({ name }))
    ).map((s) => s.name);
    expect(sorted).toEqual(['6A', '8A', '10A', '12A', '14A']);
    expect(compareSizeNames('3/4 ans', '5/6 ans')).toBeLessThan(0);
    expect(compareSizeNames('8 ans', '12-14A')).toBeLessThan(0);
  });

  test('enfant, puis adulte, puis pointures, puis le reste', () => {
    const sorted = sortSizes(
      ['XL', '42', '10A', 'Taille unique', 'S', '6A', '38', 'A4'].map((name) => ({ name }))
    ).map((s) => s.name);
    expect(sorted).toEqual(['6A', '10A', 'S', 'XL', '38', '42', 'A4', 'Taille unique']);
  });

  test('toute l\'echelle des lettres, 7XL compris (tailles de la prod au 22/10/2026)', () => {
    const sorted = sortSizes(
      ['7xl', 'XS', '3XL', 'XXS', 'L', '4XL', 'XXL', 'M', 'XL', 'S', '2XL'].map((name) => ({ name }))
    ).map((s) => s.name);
    expect(sorted).toEqual(['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '7xl']);
    expect(compareSizeNames('XXL', '2XL')).toBe(0);
  });

  test('formats : ordre naturel', () => {
    expect(compareSizeNames('A5', 'A4')).toBeGreaterThan(0);
    expect(compareSizeNames('T2', 'T10')).toBeLessThan(0);
  });

  test('selections : couleurs dans l\'ordre d\'apparition, tailles triees dans chaque couleur', () => {
    const noir = { value: '#000', name: 'Noir' };
    const rouge = { value: '#f00', name: 'Rouge' };
    const line = (size: string, color: typeof noir) => ({ size: { name: size }, color, quantity: 1 });
    const sorted = sortSelections([line('12A', noir), line('M', rouge), line('6A', noir), line('S', rouge)]);
    expect(sorted.map((s) => `${s.size.name}/${s.color.name}`)).toEqual(['6A/Noir', '12A/Noir', 'S/Rouge', 'M/Rouge']);
  });
});

describe('Marqueur image d\'origine (pegOrigRef)', () => {
  test('parse un nom tamponne', () => {
    expect(parsePegOrigRef('visuel__pegorig-12-abcDEF123.png')).toEqual({
      id: '12',
      documentId: 'abcDEF123',
    });
  });

  test('retourne null si pas de marqueur', () => {
    expect(parsePegOrigRef('visuel.png')).toBeNull();
    expect(parsePegOrigRef(undefined)).toBeNull();
  });

  test('retire le marqueur du nom', () => {
    expect(stripPegOrigMarker('visuel__pegorig-12-abc.png')).toBe('visuel.png');
    expect(stripPegOrigMarker('visuel.png')).toBe('visuel.png');
  });

  test('construit un nom tamponne avec extension preservee', () => {
    const name = buildPegOrigName('logo.png', { id: '7', documentId: 'xyz' });
    expect(name).toBe('logo__pegorig-7-xyz.png');
    expect(parsePegOrigRef(name)).toEqual({ id: '7', documentId: 'xyz' });
  });

  test('remplace un marqueur existant au lieu de le cumuler', () => {
    const once = buildPegOrigName('logo.png', { id: '1', documentId: 'aaa' });
    const twice = buildPegOrigName(once, { id: '2', documentId: 'bbb' });
    expect(twice).toBe('logo__pegorig-2-bbb.png');
    // un seul marqueur present
    expect((twice.match(/__pegorig-/g) || []).length).toBe(1);
  });

  test('gere un nom sans extension', () => {
    const name = buildPegOrigName('logo', { id: '3', documentId: 'ccc' });
    expect(name).toBe('logo__pegorig-3-ccc');
    expect(parsePegOrigRef(name)).toEqual({ id: '3', documentId: 'ccc' });
  });
});
