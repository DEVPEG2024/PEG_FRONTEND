import {
  OUTSIDE_CATEGORY_SUFFIX,
  rememberOptions,
  withAttachedOutsideCategory,
} from '@/views/app/admin/products/product/Forms/attachedOptions';

// Formulaire produit : une taille/couleur rattachée hors de la catégorie doit
// rester VISIBLE (cartes de visite Icart, 25/09/2026).

const horizontal = { value: 'h', label: '55x85mm horizontal' };
const vertical = { value: 'v', label: '85x55mm vertical' };

describe('tailles et couleurs hors de la catégorie du produit', () => {
  it('une valeur rattachée hors catégorie est affichée, marquée', () => {
    const { options, outside } = withAttachedOutsideCategory(
      [horizontal],
      [horizontal, vertical],
      ['h', 'v'],
      'Taille'
    );
    expect(outside).toEqual([
      { value: 'v', label: '85x55mm vertical' + OUTSIDE_CATEGORY_SUFFIX },
    ]);
    expect(options.map((o) => o.value)).toEqual(['h', 'v']);
  });

  it('tout dans la catégorie : rien d’ajouté', () => {
    const { options, outside } = withAttachedOutsideCategory(
      [horizontal, vertical],
      [],
      ['h'],
      'Taille'
    );
    expect(outside).toEqual([]);
    expect(options).toHaveLength(2);
  });

  it('nom inconnu : libellé de repli, jamais une pastille vide', () => {
    const { outside } = withAttachedOutsideCategory([], [], ['x'], 'Couleur');
    expect(outside[0].label).toBe('Couleur' + OUTSIDE_CATEGORY_SUFFIX);
  });

  it('aucune sélection', () => {
    expect(
      withAttachedOutsideCategory([horizontal], [], undefined, 'Taille').outside
    ).toEqual([]);
  });

  it('le registre des noms garde tout ce qui a été vu, le plus récent l’emporte', () => {
    const first = rememberOptions([vertical])([]);
    const next = rememberOptions([
      horizontal,
      { value: 'v', label: 'Vertical (renommé)' },
    ])(first);
    expect(next).toEqual([
      { value: 'v', label: 'Vertical (renommé)' },
      horizontal,
    ]);
  });
});
