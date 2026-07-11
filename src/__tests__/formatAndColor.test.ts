/**
 * Tests unitaires — utilitaires d'affichage/format purs :
 *  - colorResolver : pastille couleur lisible (les imports Imbretex arrivent en
 *    #000000 par défaut → il faut déduire la couleur du NOM). Bugs couleur réels.
 *  - barcode : génération EAN-13 avec chiffre de contrôle valide.
 *  - truncatedText : troncature de texte.
 */

import { resolveColorHex, isHexColor } from '@/utils/colorResolver';
import { generateEAN13 } from '@/utils/barcode';
import { truncatedText } from '@/utils/truncatedText';

describe('isHexColor', () => {
  test('accepte #RGB et #RRGGBB, insensible à la casse et aux espaces', () => {
    expect(isHexColor('#fff')).toBe(true);
    expect(isHexColor('#FFFFFF')).toBe(true);
    expect(isHexColor('  #1a2B3c ')).toBe(true);
  });

  test('refuse les valeurs non-hex', () => {
    expect(isHexColor('fff')).toBe(false); // pas de #
    expect(isHexColor('#ff')).toBe(false); // mauvaise longueur
    expect(isHexColor('#gggggg')).toBe(false); // hors [0-9a-f]
    expect(isHexColor('')).toBe(false);
    expect(isHexColor(undefined)).toBe(false);
  });
});

describe('resolveColorHex — valeur explicite', () => {
  test('respecte une vraie valeur hex fournie', () => {
    expect(resolveColorHex('Peu importe', '#123456')).toBe('#123456');
  });

  test('ignore le noir par défaut de l\'import et déduit depuis le nom', () => {
    expect(resolveColorHex('Rouge', '#000000')).toBe('#e11d48');
    expect(resolveColorHex('Vert', '#000')).toBe('#16a34a');
  });
});

describe('resolveColorHex — déduction depuis le nom', () => {
  test('noms FR reconnus', () => {
    expect(resolveColorHex('Bleu')).toBe('#2563eb');
    expect(resolveColorHex('JAUNE')).toBe('#eab308');
  });

  test('noms EN reconnus', () => {
    expect(resolveColorHex('red')).toBe('#e11d48');
    expect(resolveColorHex('navy')).toBe('#1e3a8a');
  });

  test('les expressions multi-mots priment sur le token isolé', () => {
    // "bleu marine" doit donner le marine, pas le bleu simple
    expect(resolveColorHex('bleu marine')).toBe('#1e3a8a');
    expect(resolveColorHex('navy blue')).toBe('#1e3a8a');
    expect(resolveColorHex('baby pink')).toBe('#f9a8d4');
  });

  test('extrait le token couleur d\'un libellé composé', () => {
    expect(resolveColorHex('T-Shirt Rouge')).toBe('#e11d48');
  });
});

describe('resolveColorHex — repli déterministe', () => {
  test('nom inconnu → couleur hex valide et STABLE', () => {
    const a = resolveColorHex('Fuchsia Flash Special');
    const b = resolveColorHex('Fuchsia Flash Special');
    expect(isHexColor(a)).toBe(true);
    expect(a).toBe(b); // déterministe : même nom → même pastille
  });

  test('deux noms différents peuvent donner des couleurs différentes', () => {
    // pas garanti à 100% mais extrêmement probable sur la palette de repli
    const set = new Set(
      ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'].map((n) => resolveColorHex(n))
    );
    expect(set.size).toBeGreaterThan(1);
  });

  test('nom vide + aucune valeur → gris neutre', () => {
    expect(resolveColorHex('', '')).toBe('#9ca3af');
    expect(resolveColorHex(undefined, undefined)).toBe('#9ca3af');
  });
});

describe('generateEAN13 — chiffre de contrôle', () => {
  // Recalcul indépendant de la clé EAN-13 sur les 12 premiers chiffres.
  const expectedCheckDigit = (twelve: string) => {
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseInt(twelve[i], 10) * (i % 2 === 0 ? 1 : 3);
    return (10 - (sum % 10)) % 10;
  };

  test('produit 13 chiffres numériques', () => {
    for (let k = 0; k < 50; k++) {
      const ean = generateEAN13();
      expect(ean).toMatch(/^\d{13}$/);
    }
  });

  test('le 13e chiffre est une clé de contrôle EAN-13 valide', () => {
    for (let k = 0; k < 100; k++) {
      const ean = generateEAN13();
      const check = parseInt(ean[12], 10);
      expect(check).toBe(expectedCheckDigit(ean.slice(0, 12)));
    }
  });
});

describe('truncatedText', () => {
  test('tronque et ajoute … au-delà de la longueur', () => {
    expect(truncatedText('Bonjour tout le monde', 7)).toBe('Bonjour...');
  });

  test('ne modifie pas un texte plus court ou égal', () => {
    expect(truncatedText('Court', 10)).toBe('Court');
    expect(truncatedText('Egal', 4)).toBe('Egal'); // length === limit → inchangé
  });
});
