import axios from 'axios';
import type {
  ImbretexProductsResponse,
  ImbretexPriceStock,
  ImbretexPriceStockResponse,
  ImbretexStocksResponse,
  ImbretexPricesResponse,
  ImbretexDeletedResponse,
} from '@/@types/imbretex';

// Les appels Imbretex passent par le PROXY backend PEG (le token Imbretex est
// détenu côté serveur, jamais exposé dans le bundle front).
// Dev: backend Express local ; Prod: proxy same-origin /peg-api -> peg-backend.
const PEG_BACKEND_BASE = import.meta.env.DEV
  ? 'http://localhost:3000'
  : '/peg-api';

// baseURL = proxy backend ; le backend ajoute le Bearer token Imbretex.
const imbretexAxios = axios.create({
  baseURL: `${PEG_BACKEND_BASE}/imbretex/api`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

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
  const { data } = await imbretexAxios.get<ImbretexProductsResponse>(
    '/products/products',
    { params: { perPage: 50, page: 1, ...params } }
  );
  return data;
}

// ─── Deleted products ───

export async function apiGetImbretexDeletedProducts(
  since: string,
  page = 1,
  perPage = 50
): Promise<ImbretexDeletedResponse> {
  const { data } = await imbretexAxios.get<ImbretexDeletedResponse>(
    '/products/deleted',
    { params: { since, page, perPage } }
  );
  return data;
}

// ─── Stocks (bulk) ───

export async function apiGetImbretexStocks(
  page = 1,
  perPage = 1000,
  since?: string
): Promise<ImbretexStocksResponse> {
  const { data } = await imbretexAxios.get<ImbretexStocksResponse>(
    '/products/stocks',
    { params: { page, perPage, ...(since ? { since } : {}) } }
  );
  return data;
}

// ─── Prices (bulk) ───

export async function apiGetImbretexPrices(
  page = 1,
  perPage = 1000,
  since?: string
): Promise<ImbretexPricesResponse> {
  const { data } = await imbretexAxios.get<ImbretexPricesResponse>(
    '/products/prices',
    { params: { page, perPage, ...(since ? { since } : {}) } }
  );
  return data;
}

// ─── Price + Stock par références ───

export async function apiGetImbretexPriceStock(
  references: string[]
): Promise<ImbretexPriceStockResponse> {
  const { data } = await imbretexAxios.get<ImbretexPriceStockResponse>(
    '/products/price-stock',
    { params: { products: references } }
  );
  return data;
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
  const { data } = await imbretexAxios.get<ImbretexPriceStockByRefResponse>(
    `/products/price-stock/${productReference}`
  );
  return data;
}
