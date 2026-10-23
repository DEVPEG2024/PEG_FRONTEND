import {
  MAX_BADGES,
  PRESET_KINDS,
  addBadge,
  badgeTextColor,
  customBadgeLibrary,
  hasNewBadge,
  isBadgeExpired,
  parisDay,
  parseBadges,
  removeBadge,
  setBadgeUntil,
  shownBadges,
} from '@/utils/productBadges';
import { buildDuplicateProductInput } from '@/views/app/admin/products/store/productDuplicate';
import type { Product } from '@/@types/product';

// Badges posés par l'admin sur un produit (23/10/2026) : « Nouveau », « Promo »…
// ou personnalisés, avec date de fin facultative, 3 au plus.

describe('parseBadges — le JSON du serveur est relu, jamais cru', () => {
  it('préréglages et personnalisés valides ; le reste ignoré', () => {
    expect(parseBadges([
      { kind: 'promo' },
      { kind: 'inconnu' },
      { kind: 'custom', label: '   ' },
      { kind: 'custom', label: '  Made   in France ', color: '#ABC' },
      null,
      'x',
    ])).toEqual([
      { kind: 'promo' },
      { kind: 'custom', label: 'Made in France', color: '#aabbcc' },
    ]);
  });
  it('texte JSON accepté ; valeur illisible → aucun badge', () => {
    expect(parseBadges('[{"kind":"new"}]')).toEqual([{ kind: 'new' }]);
    expect(parseBadges('{oups')).toEqual([]);
    expect(parseBadges(null)).toEqual([]);
    expect(parseBadges({ kind: 'new' })).toEqual([]);
  });
  it('doublons retirés (même préréglage, même libellé sans casse), 3 au plus', () => {
    const r = parseBadges([{ kind: 'new' }, { kind: 'new' }, { kind: 'custom', label: 'Club' }, { kind: 'custom', label: 'CLUB' }, { kind: 'promo' }, { kind: 'eco' }]);
    expect(r.map((b) => b.kind)).toEqual(['new', 'custom', 'promo']);
    expect(r).toHaveLength(MAX_BADGES);
  });
  it('libellé coupé à 20 caractères, couleur invalide → couleur par défaut, date mal formée ignorée', () => {
    const [b] = parseBadges([{ kind: 'custom', label: 'Une étiquette beaucoup trop longue', color: 'rouge', until: '31/10/2026' }]);
    expect(b.label).toHaveLength(20);
    expect(b.color).toBe('#2f6fed');
    expect(b.until).toBeUndefined();
  });
});

describe('shownBadges — ce que voit le client aujourd’hui', () => {
  it('libellés et couleurs résolus, texte lisible sur la couleur', () => {
    expect(shownBadges([{ kind: 'new' }, { kind: 'custom', label: 'Club', color: '#0b0e1a' }], '2026-10-23')).toEqual([
      { key: 'new', kind: 'new', label: 'Nouveau', color: '#15803d', text: '#ffffff' },
      { key: 'custom:club', kind: 'custom', label: 'Club', color: '#0b0e1a', text: '#ffffff' },
    ]);
  });
  it('date de fin incluse : affiché le dernier jour, masqué le lendemain', () => {
    const promo = [{ kind: 'promo', until: '2026-10-31' }];
    expect(shownBadges(promo, '2026-10-31')).toHaveLength(1);
    expect(shownBadges(promo, '2026-11-01')).toHaveLength(0);
    expect(isBadgeExpired({ kind: 'promo', until: '2026-10-31' }, '2026-11-01')).toBe(true);
  });
  it('jour de Paris (23 h 30 à Paris le 31 = encore le 31)', () => {
    expect(parisDay(new Date('2026-10-31T22:30:00Z'))).toBe('2026-10-31');
    expect(parisDay(new Date('2026-10-31T23:30:00Z'))).toBe('2026-11-01');
  });
  it('« Nouveau » posé à la main (et encore valable)', () => {
    expect(hasNewBadge([{ kind: 'new' }], '2026-10-23')).toBe(true);
    expect(hasNewBadge([{ kind: 'new', until: '2026-10-01' }], '2026-10-23')).toBe(false);
    expect(hasNewBadge([{ kind: 'promo' }], '2026-10-23')).toBe(false);
  });
  it('contraste : la couleur de texte la plus lisible (encre sur clair, blanc sur foncé)', () => {
    expect(badgeTextColor('#f59e0b')).toBe('#141a2e');
    expect(badgeTextColor('#ffffff')).toBe('#141a2e');
    expect(badgeTextColor('#22c55e')).toBe('#141a2e');
    expect(badgeTextColor('#2f6fed')).toBe('#ffffff');
    expect(badgeTextColor('#0b0e1a')).toBe('#ffffff');
  });
  it('chaque préréglage est lisible : contraste texte / fond ≥ 4,5:1', () => {
    const lum = (hex: string) => {
      const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    };
    const contrast = (a: string, c: string) => {
      const [hi, lo] = [lum(a), lum(c)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    const presets = shownBadges(PRESET_KINDS.map((kind) => ({ kind })), '2026-10-23');
    expect(presets).toHaveLength(MAX_BADGES); // 3 au plus, même en lecture
    for (const kind of PRESET_KINDS) {
      const [b] = shownBadges([{ kind }], '2026-10-23');
      expect({ kind, ok: contrast(b.text, b.color) >= 4.5 }).toEqual({ kind, ok: true });
    }
    expect(shownBadges([{ kind: 'bestseller' }], '2026-10-23')[0].text).toBe('#141a2e');
  });
});

describe('éditeur admin', () => {
  it('ajout sans doublon, 3 au plus ; retrait', () => {
    let list = addBadge([], { kind: 'new' });
    list = addBadge(list, { kind: 'new' });
    list = addBadge(list, { kind: 'custom', label: 'Club', color: '#ec4899' });
    list = addBadge(list, { kind: 'promo' });
    list = addBadge(list, { kind: 'eco' });
    expect(list.map((b) => b.kind)).toEqual(['new', 'custom', 'promo']);
    expect(removeBadge(list, 'custom:club').map((b) => b.kind)).toEqual(['new', 'promo']);
  });
  it('date de fin posée puis retirée', () => {
    const list = setBadgeUntil([{ kind: 'promo' }], 'promo', '2026-11-30');
    expect(list).toEqual([{ kind: 'promo', until: '2026-11-30' }]);
    expect(setBadgeUntil(list, 'promo', '')).toEqual([{ kind: 'promo' }]);
  });
  it('bibliothèque : badges personnalisés distincts des autres produits, sans date', () => {
    expect(customBadgeLibrary([
      [{ kind: 'custom', label: 'Club', color: '#ec4899', until: '2026-01-01' }, { kind: 'new' }],
      '[{"kind":"custom","label":"club","color":"#000"}]',
      [{ kind: 'custom', label: 'Atelier', color: '#22c55e' }],
      null,
    ])).toEqual([
      { kind: 'custom', label: 'Atelier', color: '#22c55e' },
      { kind: 'custom', label: 'Club', color: '#ec4899' },
    ]);
  });
});

describe('duplication / copie d’offres', () => {
  const product = { documentId: 'p1', name: 'Polo', priceTiers: [], images: [] } as unknown as Product;
  it('les badges de l’original suivent la copie', () => {
    expect(buildDuplicateProductInput(product, [], [{ kind: 'promo' }]).badges).toEqual([{ kind: 'promo' }]);
  });
  it('sans badge (ou champ non déployé) : aucun champ `badges` envoyé', () => {
    expect('badges' in buildDuplicateProductInput(product, [], [])).toBe(false);
    expect('badges' in buildDuplicateProductInput(product, [], null)).toBe(false);
    expect('badges' in buildDuplicateProductInput(product, [])).toBe(false);
  });
});
