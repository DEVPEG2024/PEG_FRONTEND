/*
 * Duplication d'un produit / d'une offre (bouton « Dupliquer » de la liste).
 *
 * Avant (corrigé le 23/10/2026), la copie réutilisait TOUTE la lecture de la
 * fiche d'édition (`apiGetProductForEditById`) telle quelle dans la mutation de
 * création. Chaque champ ajouté à cette lecture partait donc en écriture sous sa
 * forme d'objet : `checklist { documentId }` (depuis mars) puis
 * `batFile { url name }` (depuis le 25/09) — GraphQL refusait la mutation (400)
 * et aucun produit avec checklist ou BAT ne se dupliquait plus (17 en prod),
 * alors que la liste affichait « Produit dupliqué ».
 *
 * La copie est désormais construite champ par champ : un champ ajouté à la
 * lecture ne peut plus casser la duplication.
 */
import { Product } from '@/@types/product';

export const DUPLICATE_SUFFIX = ' (copie)';

/** Nom de la copie : distinct de l'original pour ne pas modifier le mauvais. */
export const duplicateName = (name: string | null | undefined): string => {
  const base = (name ?? '').trim();
  return base ? base + DUPLICATE_SUFFIX : DUPLICATE_SUFFIX.trim();
};

/** Données de création envoyées à `createProduct` (relations en identifiants). */
export type DuplicateProductInput = {
  name: string;
  description: string;
  price?: number;
  priceTiers: Product['priceTiers'];
  pricingMode?: Product['pricingMode'];
  pricePerM2?: number;
  minM2?: number;
  cost?: number | null;
  catalogPrice?: number | null;
  inCatalogue: boolean;
  active: boolean;
  requiresBat: boolean;
  productRef?: string;
  refVisibleToCustomer?: boolean;
  /** Média Strapi : id NUMÉRIQUE des fichiers (pas leur documentId). */
  images: string[];
  sizes: string[];
  colors: string[];
  form: string | null;
  checklist: string | null;
  productCategory: string | null;
  customerCategories: string[];
  customers: string[];
};

const ids = (list: { documentId: string }[] | null | undefined): string[] =>
  (list ?? []).map(({ documentId }) => documentId);

/**
 * Copie d'un produit lu par `apiGetProductForEditById`.
 *
 * - `imageIds` : ids numériques des photos de l'original. La copie partage les
 *   mêmes fichiers — c'est sans risque depuis que la suppression d'un produit
 *   n'efface plus ses fichiers (voir `ProductsList.onDeleted`).
 * - Copie INACTIVE : elle est rattachée aux mêmes clients que l'original, qui
 *   verraient sinon deux offres identiques. L'enregistrer depuis sa fiche
 *   l'active (comme toute fiche enregistrée).
 * - Le fichier de BAT n'est PAS copié : il montre la maquette d'un client
 *   précis. `requiresBat` est conservé ; l'admin joint le BAT de la copie.
 */
export function buildDuplicateProductInput(
  product: Product,
  imageIds: string[]
): DuplicateProductInput {
  return {
    name: duplicateName(product.name),
    description: product.description ?? '',
    price: product.price,
    priceTiers: product.priceTiers ?? [],
    pricingMode: product.pricingMode,
    pricePerM2: product.pricePerM2,
    minM2: product.minM2,
    cost: product.cost,
    catalogPrice: product.catalogPrice,
    inCatalogue: product.inCatalogue ?? false,
    active: false,
    requiresBat: product.requiresBat ?? false,
    productRef: product.productRef,
    refVisibleToCustomer: product.refVisibleToCustomer,
    images: imageIds,
    sizes: ids(product.sizes),
    colors: ids(product.colors),
    form: product.form?.documentId ?? null,
    checklist: product.checklist?.documentId ?? null,
    productCategory: product.productCategory?.documentId ?? null,
    customerCategories: ids(product.customerCategories),
    customers: ids(product.customers),
  };
}
