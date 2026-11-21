/**
 * Photos des produits Master Print retrouvées chez le fabricant (admin seulement).
 * Backend : peg_strapi `src/services/master-print-photos.service.ts`.
 */

/** Produit PEG relié à Master Print, tel que le rend GET /master-print/admin/photos. */
export type PhotoProduct = {
  documentId: string;
  name: string;
  active: boolean;
  mpProductId: string;
  brand: string | null;
  sku: string | null;
  category: string;
  kind: 'textile' | 'other';
  colors: Array<{
    code: string;
    label: string;
    hex: string | null;
    pegColorDocumentId: string | null;
  }>;
  /** Coloris proposés par l'offre (vide = tous) ; le premier donne la photo principale. */
  offerColors: string[];
  offerActive: boolean;
  imageCount: number;
  photos: {
    byColor: Record<string, number>;
    gallery: number[];
    supplierRef: string | null;
    updatedAt: string | null;
  };
  error: string | null;
};

export type PhotoProductsResponse = { products: PhotoProduct[] };

export type SavePhotosBody = {
  gallery: number[];
  byColor: Record<string, number>;
  supplierRef: string | null;
  addToGallery?: boolean;
};

export type SavePhotosResult = {
  productDocumentId: string;
  galleryApplied: boolean;
  galleryKept: boolean;
  imageCount: number;
  photos: PhotoProduct['photos'];
};

/** Coloris d'un produit du catalogue fournisseur, avec sa première photo. */
export type SupplierColor = {
  name: string;
  hex: string | null;
  imageUrl: string | null;
};

/** Fiche compacte d'un produit du catalogue fournisseur (index gardé en mémoire). */
export type SupplierEntry = {
  reference: string;
  ref: string;
  brand: string;
  brandKey: string;
  /** Premier mot de la marque (« B&C Outerwear » → BC). */
  brandFamily: string;
  title: string;
  tokens: string[];
  variantRefs: string[];
  colors: SupplierColor[];
  mainImage: string | null;
};

export type MatchLevel =
  | 'sure'
  | 'probable'
  | 'choose'
  | 'notFound'
  | 'noSupplierPhoto';

export type MatchResult = {
  level: MatchLevel;
  entry: SupplierEntry | null;
  candidates: SupplierEntry[];
};

/** Photos à copier pour un produit : URL fournisseur par coloris + galerie ordonnée. */
export type PhotoPlan = {
  byColor: Record<string, string>;
  gallery: string[];
  covered: number;
  total: number;
  approx: string[];
};
