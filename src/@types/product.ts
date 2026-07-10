import { Customer, CustomerCategory } from './customer';
import { Form } from './form';
import { PegFile } from './pegFile';
import { Checklist } from './checklist';

export type PriceTier = {
  minQuantity: number;
  price: number;
};

export type Product = {
  active: boolean;
  description: string;
  documentId: string;
  images: PegFile[];
  name: string;
  /**
   * Legacy simple price stored in the backend.  Most of the codebase has
   * been migrated to use `priceTiers` instead.  The helper
   * `getProductBasePrice` (in `src/utils/productHelpers.ts`) provides a
   * single entry point for reading the current value.
   */
  price?: number;
  priceTiers: PriceTier[];
  sizes: Size[];
  colors: Color[];
  form: Form;
  checklist?: Checklist;
  productCategory: ProductCategory;
  customerCategories: CustomerCategory[];
  customers: Customer[];
  inCatalogue: boolean;
  productRef?: string;
  refVisibleToCustomer?: boolean;
  /**
   * Produit mis en avant dans l'onglet « Nos suggestions » du catalogue client.
   * Champ Strapi à déployer côté backend (peg_strapi) — le frontend détecte sa
   * disponibilité via `apiIsSuggestedFieldAvailable` et bascule sur les
   * nouveautés tant qu'il n'existe pas.
   */
  suggested?: boolean;
  requiresBat?: boolean;
  batFile?: PegFile | null;
  catalogPrice?: number | null;
  pricingMode?: 'tiers' | 'packs' | 'm2';
  pricePerM2?: number;
  minM2?: number;
  /**
   * Prix de revient HT (coût fournisseur). Référence INTERNE admin uniquement,
   * jamais exposée au client. Sert au calcul des marges sur les produits et
   * les commandes. Rempli automatiquement à l'import catalogue (= prix fournisseur).
   */
  cost?: number | null;
};

/**
 * Forme « requête » d'un produit envoyée au backend GraphQL : les relations
 * (images, sizes, colors, form, productCategory, customerCategories, customers)
 * y sont des `documentId` (string) et non des objets complets, car Strapi v5
 * attend des identifiants en écriture. Voir `productsSlice.duplicateProduct`.
 */
export type ProductRequest = Omit<
  Product,
  | 'images'
  | 'sizes'
  | 'colors'
  | 'form'
  | 'productCategory'
  | 'customerCategories'
  | 'customers'
> & {
  images: string[];
  sizes: string[];
  colors: string[];
  form?: string;
  productCategory?: string;
  customerCategories: string[];
  customers: string[];
};

export type Size = {
  documentId: string;
  name: string;
  value: string;
  description: string;
  /** @deprecated catégorie unique historique — conservée pour compatibilité. Utiliser `productCategories`. */
  productCategory?: ProductCategory | null;
  /** Catégories produit auxquelles cette taille est rattachée (relation multiple). */
  productCategories?: ProductCategory[];
};

export type Color = {
  documentId: string;
  name: string;
  value: string;
  description: string;
  /** @deprecated catégorie unique historique — conservée pour compatibilité. Utiliser `productCategories`. */
  productCategory?: ProductCategory | null;
  /** Catégories produit auxquelles cette couleur est rattachée (relation multiple). */
  productCategories?: ProductCategory[];
};

export type SizeAndColorSelection = {
  size: Size;
  color: Color;
  quantity: number;
  // m² pricing: dimensions in meters
  width?: number;
  height?: number;
};

export type ProductCategory = {
  documentId: string;
  name: string;
  active: boolean;
  order?: number;
  image?: PegFile;
  products: Product[];
  parent?: ProductCategory | null;
  subcategories?: ProductCategory[];
};

export type ProductForm = {
  label: string;
  value: string;
  status: boolean;
  options: OptionsFields[];
};

export type OptionsFields = {
  label: string;
  value: string;
  stock: number;
};
