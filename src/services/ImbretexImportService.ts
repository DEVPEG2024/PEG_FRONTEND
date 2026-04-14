/**
 * Service d'import de produits Imbretex → PEG
 *
 * Gère la création automatique des catégories, tailles, couleurs,
 * le téléchargement des images, et la création du produit complet.
 */

import type { ImbretexProduct, ImbretexVariant, ImbretexPriceStock } from '@/@types/imbretex';
import type { Size, Color, ProductCategory } from '@/@types/product';
import { apiCreateProduct } from './ProductServices';
import { apiCreateSize, apiGetSizes } from './SizeServices';
import { apiCreateColor, apiGetColors } from './ColorServices';
import {
  apiGetProductCategories,
  apiCreateProductCategory,
  GetProductCategoriesResponse,
} from './ProductCategoryServices';
import { apiUploadFile } from './FileServices';
import { apiGetImbretexPriceStockByRef } from './ImbretexService';
import { unwrapData } from '@/utils/serviceHelper';

// ─── Caches (reset à chaque session d'import) ───

let categoryCache: Map<string, string> = new Map(); // name → documentId
let sizeCache: Map<string, string> = new Map();     // name → documentId
let colorCache: Map<string, string> = new Map();    // name → documentId

export function resetImportCaches() {
  categoryCache.clear();
  sizeCache.clear();
  colorCache.clear();
}

// ─── Helpers ───

function fixImageUrl(url: string): string {
  return url.replace('admin.preprod.imbretex-upgrade.hegyd.net', 'www.imbretex.fr');
}

function getBestImageUrl(product: ImbretexProduct): string | null {
  if (Array.isArray(product.images) && product.images.length > 0) {
    return fixImageUrl(product.images[0].url);
  }
  if (!Array.isArray(product.images) && product.images?.url) {
    return fixImageUrl(product.images.url);
  }
  for (const v of product.variants) {
    if (v.images?.length > 0) return fixImageUrl(v.images[0].url);
  }
  return null;
}

function getImbretexCategory(product: ImbretexProduct): string {
  for (const v of product.variants) {
    const cat = v.categories?.[0]?.categories?.fr;
    if (cat) return cat;
  }
  return '';
}

function getImbretexFamily(product: ImbretexProduct): string {
  for (const v of product.variants) {
    const fam = v.categories?.[0]?.families?.fr;
    if (fam) return fam;
  }
  return '';
}

function getTitle(variant: ImbretexVariant): string {
  return variant.title?.fr || variant.title?.en || '';
}

function getUniqueColors(variants: ImbretexVariant[]): { name: string; hex: string }[] {
  const seen = new Set<string>();
  const result: { name: string; hex: string }[] = [];
  for (const v of variants) {
    const attr = v.attributes?.find((a) => a.type === 'color');
    const name = attr?.value;
    if (name && !seen.has(name)) {
      seen.add(name);
      result.push({ name, hex: attr?.hex || '' });
    }
  }
  return result;
}

function getUniqueSizes(variants: ImbretexVariant[]): string[] {
  const seen = new Set<string>();
  for (const v of variants) {
    const attr = v.attributes?.find((a) => a.type === 'sizes');
    if (attr?.value && attr.value !== '0') seen.add(attr.value);
  }
  return Array.from(seen);
}

// ─── Loaders (chargent les données existantes au premier appel) ───

async function loadCategories(): Promise<void> {
  if (categoryCache.size > 0) return;
  const { productCategories_connection } = await unwrapData(apiGetProductCategories()) as { productCategories_connection: GetProductCategoriesResponse };
  for (const cat of productCategories_connection.nodes) {
    categoryCache.set(cat.name.toUpperCase(), cat.documentId);
  }
}

async function loadSizes(): Promise<void> {
  if (sizeCache.size > 0) return;
  const { sizes_connection } = await unwrapData(apiGetSizes()) as any;
  for (const s of sizes_connection.nodes) {
    sizeCache.set(s.name.toUpperCase(), s.documentId);
  }
}

async function loadColors(): Promise<void> {
  if (colorCache.size > 0) return;
  const { colors_connection } = await unwrapData(apiGetColors()) as any;
  for (const c of colors_connection.nodes) {
    colorCache.set(c.name.toUpperCase(), c.documentId);
  }
}

// ─── Resolvers (find or create) ───

async function resolveCategory(name: string): Promise<string | null> {
  if (!name) return null;
  const key = name.toUpperCase();
  await loadCategories();

  if (categoryCache.has(key)) return categoryCache.get(key)!;

  // Create new category
  const { createProductCategory } = await unwrapData(
    apiCreateProductCategory({ name, active: true } as any)
  ) as { createProductCategory: ProductCategory };
  categoryCache.set(key, createProductCategory.documentId);
  return createProductCategory.documentId;
}

async function resolveSize(name: string, categoryDocId: string | null): Promise<string | null> {
  if (!name) return null;
  const key = name.toUpperCase();
  await loadSizes();

  if (sizeCache.has(key)) return sizeCache.get(key)!;

  const { createSize } = await unwrapData(
    apiCreateSize({
      name,
      value: name,
      description: '',
      ...(categoryDocId ? { productCategory: categoryDocId } : {}),
    } as any)
  ) as { createSize: Size };
  sizeCache.set(key, createSize.documentId);
  return createSize.documentId;
}

async function resolveColor(name: string, hex: string, categoryDocId: string | null): Promise<string | null> {
  if (!name) return null;
  const key = name.toUpperCase();
  await loadColors();

  if (colorCache.has(key)) return colorCache.get(key)!;

  const { createColor } = await unwrapData(
    apiCreateColor({
      name,
      value: hex || '#000000',
      description: '',
      ...(categoryDocId ? { productCategory: categoryDocId } : {}),
    } as any)
  ) as { createColor: Color };
  colorCache.set(key, createColor.documentId);
  return createColor.documentId;
}

// ─── Image download + upload ───

async function uploadImageFromUrl(url: string, filename: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
    const uploaded = await apiUploadFile(file);
    return uploaded.id;
  } catch {
    return null;
  }
}

// ─── Main import function ───

export type ImportResult = {
  success: boolean;
  reference: string;
  error?: string;
};

export async function importImbretexProduct(
  product: ImbretexProduct,
  onProgress?: (msg: string) => void,
): Promise<ImportResult> {
  const ref = product.reference;
  const mainVariant = product.variants[0];
  if (!mainVariant) {
    return { success: false, reference: ref, error: 'Pas de variante' };
  }

  try {
    const title = getTitle(mainVariant);
    const description = mainVariant.description?.fr || mainVariant.longDescription?.fr || '';
    const categoryName = getImbretexCategory(product) || getImbretexFamily(product);

    // 1. Category
    onProgress?.(`${ref}: catégorie...`);
    const categoryDocId = await resolveCategory(categoryName);

    // 2. Sizes
    onProgress?.(`${ref}: tailles...`);
    const sizeNames = getUniqueSizes(product.variants);
    const sizeDocIds: string[] = [];
    for (const name of sizeNames) {
      const id = await resolveSize(name, categoryDocId);
      if (id) sizeDocIds.push(id);
    }

    // 3. Colors
    onProgress?.(`${ref}: couleurs...`);
    const colors = getUniqueColors(product.variants);
    const colorDocIds: string[] = [];
    for (const { name, hex } of colors) {
      const id = await resolveColor(name, hex, categoryDocId);
      if (id) colorDocIds.push(id);
    }

    // 4. Price
    onProgress?.(`${ref}: prix...`);
    let price = 0;
    try {
      const priceData = await apiGetImbretexPriceStockByRef(ref);
      if (Array.isArray(priceData.products) && priceData.products.length > 0) {
        const p = parseFloat(priceData.products[0].price);
        if (!isNaN(p)) price = p;
      }
    } catch { /* price stays 0 */ }

    // 5. Image
    onProgress?.(`${ref}: image...`);
    const imageUrl = getBestImageUrl(product);
    let imageIds: number[] = [];
    if (imageUrl) {
      const ext = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
      const imgId = await uploadImageFromUrl(imageUrl, `${ref}.${ext}`);
      if (imgId) imageIds.push(Number(imgId));
    }

    // 6. Create product
    onProgress?.(`${ref}: création produit...`);
    await unwrapData(apiCreateProduct({
      name: title || ref,
      description,
      active: false,
      inCatalogue: false,
      priceTiers: [{ minQuantity: 1, price }],
      ...(categoryDocId ? { productCategory: categoryDocId } : {}),
      sizes: sizeDocIds,
      colors: colorDocIds,
      ...(imageIds.length > 0 ? { images: imageIds } : {}),
    } as any));

    return { success: true, reference: ref };
  } catch (err: any) {
    return { success: false, reference: ref, error: err?.message || 'Erreur inconnue' };
  }
}
