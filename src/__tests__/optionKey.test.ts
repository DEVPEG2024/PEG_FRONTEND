import { optionKey, sameOption } from '@/utils/optionKey';

// Cas réel (prod, 25/09/2026) : sur le Bonnet, « NOIR » et « HEATHER GREY »
// portent le même code #000000. Comparées par `value`, elles se confondaient.
const noir = { documentId: 'c67', name: 'NOIR', value: '#000000' };
const heather = { documentId: 'c173', name: 'HEATHER GREY', value: '#000000' };

describe('identité des tailles / couleurs', () => {
  it('même code hex mais couleurs différentes → distinctes', () => {
    expect(sameOption(noir, heather)).toBe(false);
    expect(optionKey(noir)).not.toBe(optionKey(heather));
  });

  it('sans documentId (ancienne ligne de panier) : valeur ET nom', () => {
    expect(sameOption({ name: 'NOIR', value: '#000000' }, { name: 'HEATHER GREY', value: '#000000' })).toBe(false);
    expect(sameOption({ name: 'NOIR', value: '#000000' }, noir)).toBe(true);
    expect(optionKey({ name: 'NOIR', value: '#000000' })).not.toBe(optionKey({ name: 'HEATHER GREY', value: '#000000' }));
  });

  it('choix par défaut et sélection m² (sans taille/couleur)', () => {
    expect(optionKey({ name: 'Default', value: 'DEFAULT' })).toBe(optionKey({ name: 'Default', value: 'DEFAULT' }));
    expect(optionKey({})).toBe('DEFAULT');
    expect(sameOption(undefined, undefined)).toBe(true);
    expect(sameOption(noir, undefined)).toBe(false);
  });
});
