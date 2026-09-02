import type {
  ImbretexProductsResponse,
  ImbretexPriceStock,
  ImbretexPriceStockResponse,
  ImbretexStocksResponse,
  ImbretexPricesResponse,
  ImbretexDeletedResponse,
} from '@/@types/imbretex';
import { pegBackendFetch } from './PegBackendClient';

// Les appels Imbretex passent par le PROXY peg-backend (le token Imbretex est
// détenu côté serveur, jamais exposé dans le bundle front). Routes réservées
// aux admins : `pegBackendFetch` ajoute le JWT Strapi et cible `/peg-api` en
// prod, `http://localhost:3000` en dev.
const IMBRETEX_PREFIX = '/imbretex/api';
const TIMEOUT_MS = 30_000;

type QueryParams = Record<string, string | number | undefined>;

async function imbretexGet<T>(path: string, params: QueryParams = {}): Promise<T> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const qs = search.toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await pegBackendFetch(`${IMBRETEX_PREFIX}${path}${qs ? `?${qs}` : ''}`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Imbretex ${path} → HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Products ───

export type GetImbretexProductsParams = {
  sinceCreated?: string; // format dd-mm-yyyy
  sinceUpdated?: string;
  perPage?: number;      // max 50
  page?: number;
};

export async function apiGetImbretexProducts(
  params: GetImbretexProductsParams = {}
): Promise<ImbretexProductsResponse> {
  return imbretexGet<ImbretexProductsResponse>('/products/products', {
    perPage: 50,
    page: 1,
    ...params,
  });
}

// ─── Deleted products ───

export async function apiGetImbretexDeletedProducts(
  since: string,
  page = 1,
  perPage = 50
): Promise<ImbretexDeletedResponse> {
  return imbretexGet<ImbretexDeletedResponse>('/products/deleted', { since, page, perPage });
}

// ─── Stocks (bulk) ───

export async function apiGetImbretexStocks(
  page = 1,
  perPage = 1000,
  since?: string
): Promise<ImbretexStocksResponse> {
  return imbretexGet<ImbretexStocksResponse>('/products/stocks', { page, perPage, since });
}

// ─── Prices (bulk) ───

export async function apiGetImbretexPrices(
  page = 1,
  perPage = 1000,
  since?: string
): Promise<ImbretexPricesResponse> {
  return imbretexGet<ImbretexPricesResponse>('/products/prices', { page, perPage, since });
}

// ─── Price + Stock par références ───

export async function apiGetImbretexPriceStock(
  references: string[]
): Promise<ImbretexPriceStockResponse> {
  // L'API attend `products=ref1,ref2` (liste séparée par des virgules).
  return imbretexGet<ImbretexPriceStockResponse>('/products/price-stock', {
    products: references.join(','),
  });
}

// ─── Price + Stock par référence produit (toutes variantes) ───

export type ImbretexPriceStockByRefResponse = {
  success: boolean;
  products: ImbretexPriceStock[];
  products_not_found?: string;
};

export async function apiGetImbretexPriceStockByRef(
  productReference: string
): Promise<ImbretexPriceStockByRefResponse> {
  return imbretexGet<ImbretexPriceStockByRefResponse>(
    `/products/price-stock/${encodeURIComponent(productReference)}`
  );
}
