import {
  canDeleteCampaign,
  categoryLink,
  ctaTargetOf,
  deleteConfirmText,
  excerpt,
  filterRecipients,
  fromLocalInput,
  isInternalLink,
  isSafeCtaUrl,
  parseMessage,
  pct,
  productLink,
  recipientsToCsv,
  toLocalInput,
} from '@/utils/campaignFormat';
import type { CampaignRecipient } from '@/@types/campaign';

// Règles d'affichage des campagnes clients (mêmes règles que le serveur,
// peg_strapi `campaign-text.ts`).

describe('message', () => {
  test('paragraphes, gras et liens https — aucun HTML interprété', () => {
    const blocks = parseMessage('Bonjour <b>vous</b>\n**Promo** sur https://mypeg.fr/x.\n\nFin');
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual([
      { type: 'text', value: 'Bonjour <b>vous</b>\n' },
      { type: 'bold', value: 'Promo' },
      { type: 'text', value: ' sur ' },
      { type: 'link', value: 'https://mypeg.fr/x' },
      { type: 'text', value: '.' },
    ]);
    expect(blocks[1]).toEqual([{ type: 'text', value: 'Fin' }]);
  });

  test('javascript: et http: ne deviennent pas des liens', () => {
    const tokens = parseMessage('javascript:alert(1) http://x.fr').flat();
    expect(tokens.every((t) => t.type === 'text')).toBe(true);
  });

  test('extrait sans balisage, coupé proprement', () => {
    expect(excerpt('**Court**')).toBe('Court');
    const long = excerpt('mot '.repeat(80), 40);
    expect(long.length).toBeLessThanOrEqual(40);
    expect(long.endsWith('…')).toBe(true);
  });
});

describe('bouton d’action', () => {
  test.each([
    ['/customer/catalogue', true],
    ['https://mypeg.fr/promo', true],
    ['//evil.com', false],
    ['javascript:alert(1)', false],
    ['http://mypeg.fr', false],
    ['/\\evil.com', false],
    ['', false],
  ])('%s → %s', (url, ok) => {
    expect(isSafeCtaUrl(url)).toBe(ok);
  });

  test('chemin interne reconnu, hôte relatif refusé', () => {
    expect(isInternalLink('/customer/devis')).toBe(true);
    expect(isInternalLink('//x.fr')).toBe(false);
  });
});

describe('destination du bouton : produit, catégorie', () => {
  test('liens construits vers les routes client existantes, et sûrs', () => {
    expect(productLink('abc123')).toBe('/customer/product/abc123');
    expect(categoryLink('cat9')).toBe('/customer/catalogue/categories/cat9');
    expect(isSafeCtaUrl(productLink('abc123'))).toBe(true);
    expect(isInternalLink(categoryLink('cat9'))).toBe(true);
  });

  test('un lien enregistré est reconnu à la réouverture de la campagne', () => {
    expect(ctaTargetOf('/customer/product/abc123')).toEqual({ mode: 'product', id: 'abc123' });
    expect(ctaTargetOf('/customer/catalogue/categories/cat9')).toEqual({ mode: 'category', id: 'cat9' });
    expect(ctaTargetOf('/customer/catalogue')).toEqual({ mode: 'preset', id: null });
    expect(ctaTargetOf('https://mypeg.fr/x')).toEqual({ mode: 'custom', id: null });
    expect(ctaTargetOf('')).toEqual({ mode: 'none', id: null });
    // Sous-page d'une fiche (édition) : pas une destination « produit »
    expect(ctaTargetOf('/customer/product/abc123/edit').mode).toBe('custom');
  });
});

describe('suppression', () => {
  test('supprimable à tout moment, sauf pendant un envoi', () => {
    expect(['draft', 'scheduled', 'sent', 'canceled'].every((status) => canDeleteCampaign({ status: status as never }))).toBe(true);
    expect(canDeleteCampaign({ status: 'sending' })).toBe(false);
  });

  test('confirmation : un brouillon, sans avertissement', () => {
    expect(deleteConfirmText([{ title: 'Brouillon', status: 'draft' }])).toBe('Supprimer définitivement « Brouillon » ?');
  });

  test('confirmation : une campagne envoyée prévient des conséquences', () => {
    const t = deleteConfirmText([{ title: 'Promo', status: 'sent' }]);
    expect(t).toContain('« Promo »');
    expect(t).toContain('cloche des clients');
    expect(t).toContain('ses statistiques seront effacées');
    expect(t).toContain('« Retirer »');
  });

  test('confirmation groupée', () => {
    const t = deleteConfirmText([{ title: 'A', status: 'sent' }, { title: 'B', status: 'draft' }]);
    expect(t.startsWith('Supprimer définitivement ces 2 campagnes ?')).toBe(true);
    expect(t).toContain('L’une d’elles a déjà été envoyée : elle disparaîtra');
    expect(t).toContain('ses statistiques');
    const all = deleteConfirmText([{ title: 'A', status: 'sent' }, { title: 'B', status: 'sent' }, { title: 'C', status: 'draft' }]);
    expect(all).toContain('2 d’entre elles ont déjà été envoyées');
    expect(all).toContain('leurs statistiques');
  });
});

describe('nombres et dates', () => {
  test('taux en pourcentage français', () => {
    expect(pct(0.4237)).toBe('42 %');
    expect(pct(0.042)).toBe('4,2 %');
    expect(pct(0)).toBe('0 %');
    expect(pct(1)).toBe('100 %');
  });

  test('aller-retour du champ date-heure local', () => {
    const iso = '2026-10-01T08:30:00.000Z';
    expect(fromLocalInput(toLocalInput(iso))).toBe(iso);
    expect(fromLocalInput('')).toBeNull();
  });
});

const recipient = (over: Partial<CampaignRecipient>): CampaignRecipient => ({
  id: 1, customerDocumentId: 'c1', customerName: 'ACME', userName: 'Léa Martin', userEmail: 'lea@acme.fr',
  receivedAt: '2026-09-25T08:00:00.000Z', bellStatus: 'sent', emailStatus: 'sent', emailError: null,
  openedAt: null, lastOpenedAt: null, openChannel: null, openCount: 0, emailOpenedAt: null,
  clickedAt: null, clickCount: 0, dismissedAt: null, ...over,
});

describe('destinataires', () => {
  const list = [
    recipient({ id: 1 }),
    recipient({ id: 2, customerName: 'Bobo', userEmail: 'x@bobo.fr', openedAt: '2026-09-25T09:00:00.000Z', openChannel: 'popup', openCount: 1 }),
    recipient({ id: 3, customerName: 'Cici', openedAt: '2026-09-25T09:00:00.000Z', clickedAt: '2026-09-25T09:01:00.000Z' }),
  ];

  test('filtres ouvert / non ouvert / cliqué', () => {
    expect(filterRecipients(list, 'opened', '').map((r) => r.id)).toEqual([2, 3]);
    expect(filterRecipients(list, 'unopened', '').map((r) => r.id)).toEqual([1]);
    expect(filterRecipients(list, 'clicked', '').map((r) => r.id)).toEqual([3]);
  });

  test('recherche sur client, nom et e-mail', () => {
    expect(filterRecipients(list, 'all', 'BOBO').map((r) => r.id)).toEqual([2]);
    expect(filterRecipients(list, 'all', 'léa').map((r) => r.id)).toEqual([1, 2, 3]);
  });

  test('export CSV : séparateur « ; », guillemets, formules neutralisées', () => {
    const csv = recipientsToCsv([recipient({ customerName: '=HYPERLINK("x")', userName: 'Dupont; fils' })]);
    const [header, row] = csv.split('\r\n');
    expect(header.startsWith('Client;Compte;E-mail')).toBe(true);
    expect(row.startsWith('"\'=HYPERLINK(""x"")";"Dupont; fils";lea@acme.fr')).toBe(true);
  });
});
