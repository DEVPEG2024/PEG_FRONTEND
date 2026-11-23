import { offerAudience } from '@/views/app/admin/products/offerAudience';

describe('à qui appartient une offre (survol admin)', () => {
  it('un seul client : son nom en titre', () => {
    const a = offerAudience({ inCatalogue: false, customers: [{ name: 'ESDL DOUVAINE' }], customerCategories: [] });
    expect(a.title).toBe('Offre de ESDL DOUVAINE');
    expect(a.customers).toEqual(['ESDL DOUVAINE']);
    expect(a.nobody).toBe(false);
  });

  it('plusieurs clients et secteurs : compte, noms triés sans doublon', () => {
    const a = offerAudience({
      inCatalogue: false,
      customers: [{ name: 'Nicomatic' }, { name: 'groppi' }, { name: 'Nicomatic' }, { name: ' ' }],
      customerCategories: [{ name: 'Secteur associatif et social' }],
    });
    expect(a.title).toBe('Réservée à 2 clients et 1 secteur');
    expect(a.customers).toEqual(['groppi', 'Nicomatic']);
    expect(a.sectors).toEqual(['Secteur associatif et social']);
  });

  it('catalogue public sans rattachement', () => {
    const a = offerAudience({ inCatalogue: true, customers: [], customerCategories: null });
    expect(a.title).toBe('Catalogue public — tous les clients');
    expect(a.publicCatalogue).toBe(true);
    expect(a.nobody).toBe(false);
  });

  it('hors catalogue et rattachée à personne : signalée', () => {
    const a = offerAudience({ inCatalogue: false });
    expect(a.title).toBe('Attribuée à aucun client');
    expect(a.nobody).toBe(true);
  });
});
