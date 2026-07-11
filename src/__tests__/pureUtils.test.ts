/**
 * Tests unitaires — utilitaires purs transverses (lot final) :
 *  - categoryIcon : détection du "type" visuel d'une catégorie par mots-clés
 *    (lié au système de catégories qui a connu des bugs)
 *  - wildCardSearch : filtre de recherche des listes
 *  - sortBy : fabrique de comparateur de tri
 *  - acronym : initiales (avatars)
 *  - paginate : découpe de page
 *  - deepParseJson : parse JSON récursif tolérant
 */

import {
  normalizeLabel,
  pickCategoryColor,
  pickCategoryIcon,
} from '@/utils/categoryIcon';
import wildCardSearch from '@/utils/wildCardSearch';
import sortBy from '@/utils/sortBy';
import acronym from '@/utils/acronym';
import paginate from '@/utils/paginate';
import deepParseJson from '@/utils/deepParseJson';

describe('categoryIcon — détection par mots-clés', () => {
  test('normalizeLabel : minuscules + sans accents', () => {
    expect(normalizeLabel('Vêtement Haute-Visibilité')).toBe('vetement haute-visibilite');
  });

  test('deux libellés du même type → même couleur', () => {
    expect(pickCategoryColor('Gilet haute visibilité')).toBe(
      pickCategoryColor('Vêtements Hi-Vis fluo')
    );
  });

  test('types différents → couleurs différentes', () => {
    expect(pickCategoryColor('T-shirt personnalisé')).not.toBe(
      pickCategoryColor('Signalétique PLV')
    );
  });

  test('même type → même composant icône (identité)', () => {
    expect(pickCategoryIcon('Polo brodé')).toBe(pickCategoryIcon('Sweat textile'));
  });

  test('libellé inconnu → type par défaut (couleur stable)', () => {
    const a = pickCategoryColor('Catégorie mystère 123');
    const b = pickCategoryColor('Autre truc sans mot-clé');
    expect(a).toBe(b); // tous deux "default"
  });
});

describe('wildCardSearch', () => {
  const list = [
    { name: 'Casquette', ref: 'CAP-01' },
    { name: 'Tee-shirt', ref: 'TS-02' },
    { name: 'Gilet', ref: 'GIL-03' },
  ];

  test('trouve sur n\'importe quel champ, insensible à la casse', () => {
    expect(wildCardSearch(list, 'gilet')).toEqual([{ name: 'Gilet', ref: 'GIL-03' }]);
    expect(wildCardSearch(list, 'ts-02')).toEqual([{ name: 'Tee-shirt', ref: 'TS-02' }]);
  });

  test('restreint la recherche à une clé donnée', () => {
    // "02" est dans la ref de Tee-shirt mais on cherche sur "name" → aucun
    expect(wildCardSearch(list, '02', 'name')).toEqual([]);
  });

  test('aucune correspondance → tableau vide', () => {
    expect(wildCardSearch(list, 'zzz')).toEqual([]);
  });
});

describe('sortBy', () => {
  test('tri croissant de chaînes (localeCompare)', () => {
    const out = [{ n: 'banane' }, { n: 'abricot' }, { n: 'cerise' }]
      .sort(sortBy('n', false))
      .map((x) => x.n);
    expect(out).toEqual(['abricot', 'banane', 'cerise']);
  });

  test('tri décroissant', () => {
    const out = [{ n: 'a' }, { n: 'c' }, { n: 'b' }]
      .sort(sortBy('n', true))
      .map((x) => x.n);
    expect(out).toEqual(['c', 'b', 'a']);
  });

  test('tri numérique croissant', () => {
    const out = [{ v: 30 }, { v: 4 }, { v: 12 }]
      .sort(sortBy('v', false))
      .map((x) => x.v);
    expect(out).toEqual([4, 12, 30]);
  });
});

describe('acronym', () => {
  test('initiales de chaque mot', () => {
    expect(acronym('John Doe')).toBe('JD');
    expect(acronym('Prod Event Group')).toBe('PEG');
  });

  test('un seul mot → première lettre', () => {
    expect(acronym('Casquette')).toBe('C');
  });

  test('chaîne vide → vide', () => {
    expect(acronym('')).toBe('');
  });
});

describe('paginate', () => {
  const arr = [1, 2, 3, 4, 5, 6, 7];

  test('renvoie la tranche de la page demandée', () => {
    expect(paginate(arr, 3, 1)).toEqual([1, 2, 3]);
    expect(paginate(arr, 3, 2)).toEqual([4, 5, 6]);
    expect(paginate(arr, 3, 3)).toEqual([7]); // dernière page partielle
  });

  test('page au-delà des données → vide', () => {
    expect(paginate(arr, 3, 99)).toEqual([]);
  });
});

describe('deepParseJson', () => {
  test('parse un objet JSON', () => {
    expect(deepParseJson('{"a":1,"b":"x"}')).toEqual({ a: 1, b: 'x' });
  });

  test('parse récursivement une valeur JSON imbriquée sous forme de chaîne', () => {
    expect(deepParseJson('{"nested":"{\\"b\\":2}"}')).toEqual({ nested: { b: 2 } });
  });

  test('conserve une chaîne numérique en tant que chaîne', () => {
    expect(deepParseJson('42')).toBe('42');
  });

  test('renvoie tel quel une chaîne non-JSON', () => {
    expect(deepParseJson('bonjour')).toBe('bonjour');
  });

  test('laisse passer les primitives non-chaînes', () => {
    expect(deepParseJson(true)).toBe(true);
    expect(deepParseJson(null)).toBeNull();
  });
});
