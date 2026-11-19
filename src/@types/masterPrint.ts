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
    values: Array<{ code: string; label: string; default: boolean }>;
  }>;
  dimensions: null | {
    freeFormat: boolean;
    standardFormats: Array<{
      code: string;
      label: string;
      widthMm: number | null;
      heightMm: number | null;
    }>;
    widthMm: { min: number | null; max: number | null } | null;
    heightMm: { min: number | null; max: number | null } | null;
    rollWidthMm: number | null;
    perLength: boolean;
  };
};

export type MpCatalogItem = {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  category: string;
  bestSellerRank: number | null;
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
