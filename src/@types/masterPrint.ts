/**
 * Master Print — exécutant des projets PEG (API Master Print v1).
 * Format des routes Strapi `/api/master-print/admin/*` (peg_strapi
 * `src/services/master-print.service.ts`, règles dans `master-print-text.ts`).
 */

export type MpEnvironment = 'sandbox' | 'production';

export type MpMarking = {
  position: string;
  technique: string;
  format?: string;
  width_mm?: number;
  height_mm?: number;
};

export type MpLineConfig = {
  product_id: string;
  quantity?: number;
  format?: string;
  width_mm?: number;
  height_mm?: number;
  length_mm?: number;
  options: {
    color?: string;
    sizes?: Record<string, number>;
    markings?: MpMarking[];
    [code: string]: unknown;
  };
  production_time?: 'standard';
};

export type MpDraftLine = {
  key: string;
  pegColor: { documentId: string | null; name: string } | null;
  pegSizes: Array<{
    documentId: string | null;
    name: string;
    quantity: number;
    mpSize: string | null;
  }>;
  config: MpLineConfig;
  issues: string[];
};

export type MpProductMapping = {
  productId: string;
  productName?: string;
  colors: Record<string, string>;
  sizes: Record<string, string>;
  markings: MpMarking[];
};

export type MpColor = {
  code: string;
  label: string;
  hex?: string | null;
  available?: boolean;
};

export type MpProductView = {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  category: string;
  pricingMode: string;
  description: string | null;
  quantity: {
    min: number | null;
    max: number | null;
    step: number | null;
    note: string | null;
  };
  colors: MpColor[];
  sizes: string[];
  sizesByColor: Record<string, string[]>;
  markings: null | {
    required: boolean;
    positions: Array<{
      code: string;
      label: string;
      maxWidthMm: number | null;
      maxHeightMm: number | null;
    }>;
    techniques: Array<{ code: string; label: string }>;
    formats: Array<{
      code: string;
      label: string;
      widthMm: number | null;
      heightMm: number | null;
    }>;
  };
  otherOptions: Array<{
    code: string;
    label: string;
    type: string;
    required: boolean;
    values: Array<{
      code: string;
      label: string;
      default: boolean;
      description?: string | null;
      /** Sans supplément. */
      included?: boolean;
      /** Quantité libre à donner : jamais proposée au client. */
      custom?: boolean;
    }>;
    /** Formats avec lesquels l'option ne se combine pas. */
    notWithFormats?: string[];
  }>;
  dimensions: null | {
    freeFormat: boolean;
    standardFormats: Array<{
      code: string;
      label: string;
      widthMm: number | null;
      heightMm: number | null;
      printed?: boolean;
    }>;
    widthMm: { min: number | null; max: number | null } | null;
    heightMm: { min: number | null; max: number | null } | null;
    rollWidthMm: number | null;
    perLength: boolean;
    pieces?: {
      maxCount: number | null;
      sideMin: number | null;
      sideMax: number | null;
      maxQuantity: number | null;
    } | null;
  };
  /** Délai standard en jours ouvrés. */
  productionDays?: number | null;
};

export type MpCatalogItem = {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  category: string;
  bestSellerRank: number | null;
  /** Photo du modèle (catalogue public Master Print, hébergée chez Falk & Ross) ; absente si inconnue. */
  imageUrl?: string | null;
};

export type MpAddress = {
  company?: string;
  name?: string;
  street?: string;
  street2?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
};

export type MpProjectFile = {
  id: number;
  name: string;
  mime: string | null;
  size: number | null;
  source: string;
};

export type MpUpload = {
  lineId: string;
  slot: string;
  fileId: number;
  fileName: string;
  ok: boolean;
  error: string | null;
  at: string;
};

export type MpOrderView = {
  orderId: string;
  environment: string;
  status: string;
  statusLabel: string;
  createdAt: string | null;
  totalExclTax: number | null;
  totalWithShippingExclTax: number | null;
  blindShipping: boolean;
  tracking: {
    carrier: string | null;
    number: string | null;
    url: string | null;
    shippedAt: string | null;
  } | null;
  invoiceNumber: string | null;
  productionOrders: string[];
  lines: Array<{
    lineId: string;
    productId: string;
    status: string;
    statusLabel: string;
    totalExclTax: number | null;
    summary: string;
    files: Array<{
      slot: string;
      label: string;
      received: boolean;
      formats: string[];
    }>;
  }>;
  history: Array<{
    status: string;
    label: string;
    at: string;
    detail: string | null;
  }>;
  missingFiles: number;
  uploads: MpUpload[];
  uploading: boolean;
};

export type MpPegProduct = {
  documentId: string;
  name: string;
  ref: string | null;
  colors: Array<{ documentId: string; name: string; value?: string }>;
  sizes: Array<{ documentId: string; name: string; value?: string }>;
};

export type MpProjectDraft = {
  configured: boolean;
  environment: MpEnvironment | null;
  appliesToProject: boolean;
  project: {
    documentId: string;
    name: string;
    price: number | null;
    producerPrice: number | null;
    producerName: string | null;
    customerName: string | null;
  };
  pegProduct: MpPegProduct | null;
  mapping: MpProductMapping | null;
  mappingProposed: boolean;
  mpProduct: MpProductView | null;
  mappingError: string | null;
  lines: MpDraftLine[];
  personalization: Array<{ label: string; value: string }>;
  address: MpAddress;
  files: MpProjectFile[];
  orders: MpOrderView[];
  idempotencyKey: string;
  /** Commande composée par le client dans le formulaire d'une offre configurable. */
  offer?: null | {
    summary: string;
    files: Record<string, { id: number; name: string }>;
    /** sent | failed | manual | null (pas encore payée) */
    autoStatus: string | null;
    autoError: string | null;
    pegPrice: number | null;
    mpTotal: number | null;
  };
};

export type MpStatus =
  | { configured: false }
  | {
      configured: true;
      environment: MpEnvironment;
      clientId: string;
      company: string | null;
      paymentMode: string | null;
      priceTier: string | null;
      modules: Array<{ code: string; label: string }>;
      liveModules: Array<{ code: string; label: string }>;
      webhook: { url: string; since: string } | null;
      appliesToProject: boolean;
    };

export type MpPriceResult = {
  complete: boolean;
  productsExclTax: number | null;
  shipping: {
    amount: number | null;
    carrier: string | null;
    message: string | null;
  } | null;
  totalExclTax: number | null;
  results: Array<{
    index: number;
    ok: boolean;
    totalExclTax: number | null;
    unitPriceExclTax: number | null;
    detail: Array<{ label: string; amount: number }>;
    shipDate: string | null;
    workingDays: number | null;
    error: string | null;
    field: string | null;
  }>;
};

export type MpSendRequest = {
  idempotencyKey: string;
  lines: MpLineConfig[];
  shipping_address?: MpAddress;
  pickup?: boolean;
  blind_shipping?: boolean;
  notes?: string;
  files: Record<string, number>;
  remember?: MpProductMapping;
  accept_price_change?: boolean;
};

export type MpSimulateEvent =
  | 'payment_received'
  | 'production_started'
  | 'shipped'
  | 'delivered';

// ── Page « Catalogue Master Print » (menu Fournisseurs) ──

export type MpImportedRef = { documentId: string; name: string };

export type MpCatalogResult = MpCatalogItem & { imported: MpImportedRef[] };

export type MpCatalogPage = {
  results: MpCatalogResult[];
  matched: number;
  total: number;
  counts: Record<string, number>;
  offset: number;
};

export type MpCatalogDetails = {
  product: MpProductView;
  /** Photo du modèle (catalogue public Master Print, hébergée chez Falk & Ross). */
  imageUrl?: string | null;
  imported: MpImportedRef[];
  /** Coloris Master Print → coloris PEG existant (null = sera créé à l'import). */
  pegColors: Record<string, MpImportedRef | null>;
  pegSizes: Record<string, MpImportedRef | null>;
  /** Nom du coloris s'il est créé dans PEG (en français quand on le connaît). */
  newColorNames: Record<string, string>;
};

export type MpPriceGridTier = {
  from: number;
  to: number | null;
  unitPriceExclTax: number | null;
  unit: string;
};

export type MpGridChoice = {
  color?: string;
  markings?: MpMarking[];
  format?: string;
};

export type MpImportRequest = MpGridChoice & {
  markupPercent: number;
  categoryDocumentId?: string;
  colors: string[];
  again?: boolean;
};

export type MpImportResult = {
  productDocumentId: string;
  name: string;
  priceTiers: Array<{ minQuantity: number; price: number }>;
  cost: number | null;
  created: { colors: number; sizes: number };
};

// ── Offres configurables (formulaire client, ajout 20/11/2026) ──
// Format de `/api/configurator/*` (client) et `/api/master-print/admin/offers/*`
// (admin) — peg_strapi `src/services/master-print-offer.service.ts`, règles dans
// la section « Offres configurables » de `master-print-text.ts`.

export type OfferSpec = {
  kind: 'textile' | 'unit' | 'length';
  name: string;
  description: string | null;
  quantity: { min: number; max: number | null; step: number };
  productionDays: number | null;
  /** imageUrl : photo du coloris (fichier PEG), posée depuis « Photos des produits ». */
  colors: Array<{
    code: string;
    label: string;
    hex: string | null;
    sizes: string[];
    imageUrl?: string | null;
  }>;
  sizes: string[];
  markings: null | {
    mode: 'fixed' | 'client';
    min: number;
    max: number;
    fixed: Array<{
      position: string;
      positionLabel: string;
      techniqueLabel: string;
      sizeLabel: string;
    }>;
    positions: Array<{
      code: string;
      label: string;
      maxWidthMm: number | null;
      maxHeightMm: number | null;
      formats: string[];
    }>;
    techniques: Array<{ code: string; label: string }>;
    formats: Array<{
      code: string;
      label: string;
      widthMm: number | null;
      heightMm: number | null;
    }>;
    customSize: boolean;
  };
  options: Array<{
    code: string;
    label: string;
    type: 'select' | 'multi_select';
    required: boolean;
    values: Array<{
      code: string;
      label: string;
      description: string | null;
      default: boolean;
    }>;
    notWithFormats: string[];
  }>;
  fixedOptions: Array<{ label: string; value: string }>;
  format:
    | null
    | { mode: 'fixed'; label: string; printed: boolean }
    | {
        mode: 'client';
        formats: Array<{
          code: string;
          label: string;
          widthMm: number | null;
          heightMm: number | null;
          printed: boolean;
        }>;
        free: null | {
          width: { min: number | null; max: number | null };
          height: { min: number | null; max: number | null };
        };
      };
  pieces: null | {
    maxCount: number;
    sideMin: number;
    sideMax: number;
    maxQuantity: number;
    rollWidthMm: number | null;
  };
  ready: boolean;
};

export type OfferClientMarking = {
  position: string;
  technique?: string;
  format?: string;
  width_mm?: number;
};

export type OfferClientConfig = {
  color?: string;
  sizes?: Record<string, number>;
  quantity?: number;
  markings?: OfferClientMarking[];
  options?: Record<string, string | string[]>;
  format?: string;
  width_mm?: number;
  height_mm?: number;
  pieces?: Array<{ width_mm: number; height_mm: number; quantity: number }>;
};

/** Visuel attendu ; `formats` = extensions acceptées par l'imprimeur (PDF seul pour l'impression grand format). */
export type OfferFileSlot = { slot: string; label: string; formats: string[] };

export type OfferPrice = {
  totalExclTax: number;
  unitPriceExclTax: number | null;
  quantityLabel: string;
  detail: Array<{ label: string; amount: number }>;
  shipDate: string | null;
  workingDays: number | null;
};

export type OfferPriceResult = {
  price: OfferPrice;
  summary: string;
  files: OfferFileSlot[];
};

export type OfferUploadedFile = { id: number; name: string; url?: string };

export type OfferOrderItemResult = {
  orderItem: {
    documentId: string;
    price: number;
    state: 'pending';
    product: { documentId: string; name: string };
    sizeAndColorSelections: Array<{
      size: { documentId: string; name: string; value: string };
      color: { documentId: string; name: string; value: string };
      quantity: number;
    }>;
  };
  price: OfferPrice;
  summary: string;
};

export type OfferOptionRule = {
  mode: 'client' | 'fixed';
  value?: string | string[];
  allowed?: string[];
};

export type OfferConfig = {
  autoSend: boolean;
  markupPercent: number;
  colors: string[];
  markings: {
    mode: 'none' | 'fixed' | 'client';
    fixed: MpMarking[];
    positions: string[];
    techniques: string[];
    formats: string[];
    customSize: boolean;
    min: number;
    max: number;
  };
  options: Record<string, OfferOptionRule>;
  format: {
    mode: 'client' | 'fixed';
    fixed: string | null;
    width_mm?: number;
    height_mm?: number;
    allowed: string[];
    free: boolean;
  };
  minQuantity: number | null;
};

export type MpOfferAdmin = {
  product: {
    documentId: string;
    name: string;
    inCatalogue: boolean;
    active: boolean;
  };
  linked: boolean;
  enabled: boolean;
  mpProduct?: MpProductView;
  offer?: OfferConfig;
  issues?: string[];
  spec?: OfferSpec;
};
