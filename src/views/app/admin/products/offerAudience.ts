// À qui appartient une offre (demande du 23/11/2026) : affiché au survol de la
// carte produit de l'admin. Même règle de visibilité que le catalogue client :
// clients rattachés, secteurs rattachés, catalogue public (inCatalogue).

type Named = { documentId?: string; name?: string | null };

export type OfferAudienceSource = {
  inCatalogue?: boolean | null;
  customers?: Named[] | null;
  customerCategories?: Named[] | null;
};

export type OfferAudience = {
  /** Résumé d'une ligne : « Réservée à 2 clients », « Catalogue public »… */
  title: string;
  /** Noms des clients rattachés, triés */
  customers: string[];
  /** Noms des secteurs rattachés, triés */
  sectors: string[];
  /** Aussi visible de tous dans le catalogue public */
  publicCatalogue: boolean;
  /** Personne ne voit l'offre */
  nobody: boolean;
};

const names = (list?: Named[] | null): string[] =>
  [...new Set((list ?? []).map((x) => (x?.name ?? '').trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'fr', { sensitivity: 'base' })
  );

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

export function offerAudience(product: OfferAudienceSource): OfferAudience {
  const customers = names(product.customers);
  const sectors = names(product.customerCategories);
  const publicCatalogue = product.inCatalogue === true;
  const reserved = customers.length > 0 || sectors.length > 0;

  let title: string;
  if (customers.length === 1 && sectors.length === 0) title = `Offre de ${customers[0]}`;
  else if (reserved) {
    const parts = [
      customers.length ? plural(customers.length, 'client', 'clients') : '',
      sectors.length ? plural(sectors.length, 'secteur', 'secteurs') : '',
    ].filter(Boolean);
    title = `Réservée à ${parts.join(' et ')}`;
  } else if (publicCatalogue) title = 'Catalogue public — tous les clients';
  else title = 'Attribuée à aucun client';

  return { title, customers, sectors, publicCatalogue, nobody: !reserved && !publicCatalogue };
}
