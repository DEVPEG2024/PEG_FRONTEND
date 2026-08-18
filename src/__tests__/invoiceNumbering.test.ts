/**
 * Tests de non-régression — numérotation des factures.
 *
 * Le calcul du numéro a été retiré du navigateur : il se faisait par un
 * `MAX()+1` sur les factures existantes, en concurrence avec le même calcul
 * côté NOVA, ce qui produisait des doublons. La séquence FAC-XXXX est
 * désormais attribuée de façon atomique par Strapi
 * (peg_strapi/src/services/invoice-numbering.service.ts).
 *
 * Ces tests verrouillent les deux invariants observables côté frontend :
 *  1. aucun code client ne (re)calcule un numéro de facture ;
 *  2. une facture de la séquence n'est jamais proposée à la suppression.
 */

import fs from 'fs';
import path from 'path';
import {
  isNumberedInvoice,
  isExternalInvoice,
  invoiceSeriesLabel,
} from '@/utils/invoiceHelpers';

const SRC = path.join(__dirname, '..');

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
};

describe('isNumberedInvoice — appartenance à la séquence', () => {
  test.each(['FAC-0001', 'FAC-0042', 'FAC-10000'])('%s appartient à la série', (name) => {
    expect(isNumberedInvoice(name)).toBe(true);
  });

  test.each([
    'FAC-abc',
    'FAC-0004-bis',
    'EXT-FAC-0004',
    'INV-M9X2K-A7Z1',
    'facture-scan',
    'Prestation graphique',
    '',
  ])('%s n\'appartient pas à la série', (name) => {
    expect(isNumberedInvoice(name)).toBe(false);
  });

  test('valeurs absentes tolérées', () => {
    expect(isNumberedInvoice(undefined)).toBe(false);
    expect(isNumberedInvoice(null)).toBe(false);
  });
});

describe('classement des factures hors séquence', () => {
  test('un PDF téléversé est un document externe', () => {
    expect(isExternalInvoice('facture-scan')).toBe(true);
    expect(invoiceSeriesLabel('facture-scan')).toBe('Document externe');
  });

  test('l\'ancienne série INV-* est identifiée comme telle', () => {
    expect(isExternalInvoice('INV-M9X2K-A7Z1')).toBe(false);
    expect(invoiceSeriesLabel('INV-M9X2K-A7Z1')).toBe('Ancienne série');
  });

  test('une facture de la série n\'est pas étiquetée', () => {
    expect(invoiceSeriesLabel('FAC-0007')).toBeNull();
  });
});

describe('garde-fou — aucun calcul de numéro côté navigateur', () => {
  const files = walk(SRC);

  test('aucun fichier ne construit un numéro FAC-XXXX', () => {
    // Interdit : template literal ou concaténation produisant `FAC-…`.
    // Autorisé : les expressions régulières de reconnaissance d'invoiceHelpers.
    const offenders = files.filter((file) => {
      if (file.endsWith(path.join('utils', 'invoiceHelpers.ts'))) return false;
      const src = fs.readFileSync(file, 'utf8');
      return /['"`]FAC-\$\{/.test(src) || /['"`]FAC-['"`]\s*\+/.test(src);
    });
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });

  test('plus aucune référence à apiGetNextInvoiceNumber', () => {
    const offenders = files.filter((file) =>
      fs.readFileSync(file, 'utf8').includes('apiGetNextInvoiceNumber')
    );
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });

  test('aucune création de facture ne fixe un nom de la série', () => {
    // `name:` sur une création doit venir d'un fichier téléversé, jamais d'un
    // numéro construit localement.
    const offenders = files.filter((file) => {
      const src = fs.readFileSync(file, 'utf8');
      return /name:\s*nextNumber/.test(src) || /name:\s*`FAC-/.test(src);
    });
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });
});
