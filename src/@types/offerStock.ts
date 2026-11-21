/**
 * Stock du textile d'une offre configurable (ajout 20/11/2026).
 * Backend : peg_strapi `src/services/master-print-stock.service.ts`
 * (règles : `master-print-stock-text.ts`).
 */

/** Stock d'un coloris proposé au client. */
export type OfferStockColor = {
  code: string;
  label: string;
  hex: string | null;
  /** Toutes les tailles vendues sont épuisées. */
  soldOut: boolean;
  /** Taille → quantité commandable (0 = épuisée, null = pas de limite connue). */
  sizes: Record<string, number | null>;
  /** Tailles dont une partie arrive plus tard : quantité disponible sans délai supplémentaire. */
  immediate: Record<string, number>;
};

/** Réponse de `GET /configurator/:productDocumentId/stock` (route client, neutre). */
export type OfferStock = {
  /** false = stock inconnu : aucune limite affichée. */
  tracked: boolean;
  updatedAt: string | null;
  /** Seuil « Plus que N ». */
  lowThreshold: number;
  colors: OfferStockColor[];
};

/** Réponse de `GET /master-print/admin/catalog/:id/stock` (fiche admin du catalogue). */
export type MpCatalogStock = {
  tracked: boolean;
  updatedAt: string | null;
  colors: Array<{
    code: string;
    label: string;
    hex: string | null;
    soldOut: boolean;
    /** Total commandable du coloris (null si une taille n'est pas suivie). */
    total: number | null;
    sizes: Array<{
      size: string;
      orderable: number | null;
      stock: number;
      supplierStock: number;
    }>;
  }>;
};
