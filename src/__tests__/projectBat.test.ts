// BAT d'un projet (utils/projectBat.ts) : projet issu d'une commande de produit
// à BAT, projet issu d'un devis (BAT porté par le projet), et backend qui ne
// connaît pas encore les champs BAT du projet.
import {
  BAT_REFUSAL_PREFIX,
  batRefusalCommentContent,
  batSummaryLabel,
  findBatRefusalComment,
  getProjectBat,
  isBatAwaitingClient,
  showsBatTab,
  showsModificationsTab,
} from '@/utils/projectBat';
import { batFileKind } from '@/views/app/common/projects/details/components/bat/BatDocumentPreview';

const file = { url: 'https://s3/bat.pdf', name: 'bat.pdf' };
const productOrder = (batStatus: 'pending' | 'approved' | 'rejected' | null, batFile: typeof file | null = file) => ({
  orderItem: { batStatus, batComment: null, product: { requiresBat: true, batFile } },
});

describe('getProjectBat — commande d’un produit à BAT', () => {
  test('offre dont le BAT a été approuvé sur la fiche avant la commande → validé', () => {
    const bat = getProjectBat(productOrder('approved'));
    expect(bat).toMatchObject({ source: 'product', status: 'approved', file });
    expect(batSummaryLabel(bat)).toBe('Validé par le client');
    expect(isBatAwaitingClient(bat)).toBe(false);
  });

  test('statut vide → en attente du client', () => {
    const bat = getProjectBat(productOrder(null));
    expect(bat?.status).toBe('pending');
    expect(isBatAwaitingClient(bat)).toBe(true);
  });

  test('le produit commandé prime sur des champs BAT de projet', () => {
    const bat = getProjectBat({ ...productOrder('approved'), batStatus: 'rejected', batFile: null });
    expect(bat?.source).toBe('product');
    expect(bat?.status).toBe('approved');
  });

  test('BAT exigé mais pas encore déposé : onglet visible pour tous, « En préparation »', () => {
    const bat = getProjectBat(productOrder(null, null));
    expect(showsBatTab(bat, false)).toBe(true);
    expect(isBatAwaitingClient(bat)).toBe(false);
    expect(batSummaryLabel(bat)).toBe('En préparation');
  });
});

describe('getProjectBat — projet sans commande (devis, création admin)', () => {
  const quoteProject = { orderItem: null, batFile: null, batStatus: null, batComment: null };

  test('aucun BAT déposé : onglet pour l’admin seulement, rien dans le détail', () => {
    const bat = getProjectBat(quoteProject);
    expect(bat).toMatchObject({ source: 'project', file: null, status: 'pending' });
    expect(showsBatTab(bat, true)).toBe(true);
    expect(showsBatTab(bat, false)).toBe(false);
    expect(batSummaryLabel(bat)).toBeNull();
  });

  test('BAT déposé : visible du client, en attente de sa réponse', () => {
    const bat = getProjectBat({ ...quoteProject, batFile: file, batStatus: 'pending' as const });
    expect(showsBatTab(bat, false)).toBe(true);
    expect(isBatAwaitingClient(bat)).toBe(true);
    expect(batSummaryLabel(bat)).toBe('En attente de validation');
  });

  test('BAT refusé : motif conservé', () => {
    const bat = getProjectBat({ ...quoteProject, batFile: file, batStatus: 'rejected' as const, batComment: 'Logo trop petit' });
    expect(bat?.comment).toBe('Logo trop petit');
    expect(batSummaryLabel(bat)).toBe('Refusé par le client');
    expect(isBatAwaitingClient(bat)).toBe(false);
  });

  test('commande d’un produit SANS BAT : le BAT se dépose sur le projet', () => {
    const bat = getProjectBat({ orderItem: { batStatus: null, product: { requiresBat: false } }, batFile: null, batStatus: null });
    expect(bat?.source).toBe('project');
  });

  test('fichier sans url (envoi incomplet) = pas de BAT', () => {
    const bat = getProjectBat({ ...quoteProject, batFile: { url: '', name: 'x.pdf' } });
    expect(bat?.file).toBeNull();
    expect(isBatAwaitingClient(bat)).toBe(false);
  });
});

describe('getProjectBat — backend sans champs BAT de projet (avant déploiement Strapi)', () => {
  test('champs absents → pas de BAT de projet, onglet masqué comme avant', () => {
    const bat = getProjectBat({ orderItem: null });
    expect(bat).toBeNull();
    expect(showsBatTab(bat, true)).toBe(false);
    expect(batSummaryLabel(bat)).toBeNull();
  });

  test('la commande d’un produit à BAT fonctionne toujours', () => {
    expect(getProjectBat(productOrder('approved'))?.status).toBe('approved');
  });

  test('projet non chargé', () => {
    expect(getProjectBat(undefined)).toBeNull();
  });
});

describe('refus du client — texte et photos (bloc BAT de l’Accueil)', () => {
  const refusal = (text: string, createdAt: string, images: { url: string }[] = []) => ({
    content: batRefusalCommentContent(text), createdAt, images,
  });

  test('le commentaire porte le préfixe puis le texte saisi', () => {
    expect(batRefusalCommentContent('  Logo plus grand  ')).toBe(`${BAT_REFUSAL_PREFIX}\nLogo plus grand`);
  });

  test('retrouve le commentaire du refus en cours, le plus récent', () => {
    const comments = [
      { content: 'Bonjour', createdAt: '2026-10-22T10:00:00Z', images: [] },
      refusal('Logo plus grand', '2026-10-22T11:00:00Z', [{ url: 'a.jpg' }]),
      refusal('Logo plus grand', '2026-10-22T12:00:00Z', [{ url: 'b.jpg' }]),
    ];
    expect(findBatRefusalComment(comments, 'Logo plus grand')?.images).toEqual([{ url: 'b.jpg' }]);
  });

  test('un refus antérieur (autre texte) ne prête jamais ses photos', () => {
    const comments = [refusal('Couleur trop claire', '2026-10-20T09:00:00Z', [{ url: 'v1.jpg' }])];
    expect(findBatRefusalComment(comments, 'Logo plus grand')).toBeNull();
    expect(findBatRefusalComment(comments, null)).toBeNull();
    expect(findBatRefusalComment(undefined, 'Logo plus grand')).toBeNull();
  });

  test('onglet Modifications : seulement quand un BAT déposé est refusé', () => {
    const project = (batStatus: 'pending' | 'approved' | 'rejected' | null, batFile: typeof file | null = file) =>
      getProjectBat({ batStatus, batFile, batComment: null });
    expect(showsModificationsTab(project('rejected'))).toBe(true);
    expect(showsModificationsTab(project('pending'))).toBe(false);
    expect(showsModificationsTab(project('approved'))).toBe(false);
    expect(showsModificationsTab(project('rejected', null))).toBe(false);
    expect(showsModificationsTab(null)).toBe(false);
  });
});

describe('aperçu du BAT : type de fichier', () => {
  test('PDF, image ou autre format, par le type ou par le nom', () => {
    expect(batFileKind({ url: 'https://s3/x', name: 'bat-v2.PDF' })).toBe('pdf');
    expect(batFileKind({ url: 'https://s3/x', name: 'x', mime: 'application/pdf' })).toBe('pdf');
    expect(batFileKind({ url: 'https://s3/x.webp', name: 'maquette.webp' })).toBe('image');
    expect(batFileKind({ url: 'https://s3/x', name: 'logo.ai' })).toBe('other');
    expect(batFileKind({ url: 'https://s3/x', name: 'fichiers.zip' })).toBe('other');
  });
});
