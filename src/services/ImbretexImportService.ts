/**
 * Service d'import de produits Imbretex → PEG
 */

import type { ImbretexProduct, ImbretexVariant } from '@/@types/imbretex';
import { apiCreateProduct } from './ProductServices';
import { apiGetSizes } from './SizeServices';
import { apiGetColors } from './ColorServices';
import {
  apiGetProductCategories,
  GetProductCategoriesResponse,
} from './ProductCategoryServices';
import { apiUploadFile } from './FileServices';
import { apiGetImbretexPriceStockByRef } from './ImbretexService';
import { unwrapData } from '@/utils/serviceHelper';

// ─── Caches ───

let categoryCache: Map<string, string> | null = null; // name upper → documentId
let sizeCache: Map<string, string> | null = null;
let colorCache: Map<string, string> | null = null;

export function resetImportCaches() {
  categoryCache = null;
  sizeCache = null;
  colorCache = null;
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

function getTitle(variant: ImbretexVariant): string {
  return variant.title?.fr || variant.title?.en || '';
}

function getUniqueColors(variants: ImbretexVariant[]): { name: string; hex: string }[] {
  const seen = new Set<string>();
  const result: { name: string; hex: string }[] = [];
  for (const v of variants) {
    const attr = v.attributes?.find((a) => a.type === 'color');
    const name = attr?.value;
    if (name && !seen.has(name.toUpperCase())) {
      seen.add(name.toUpperCase());
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

// ─── Loaders : charge les données PEG existantes (une seule fois) ───

async function loadCategories(): Promise<Map<string, string>> {
  if (categoryCache) return categoryCache;
  categoryCache = new Map();
  try {
    const { productCategories_connection } = await unwrapData(apiGetProductCategories()) as { productCategories_connection: GetProductCategoriesResponse };
    for (const cat of productCategories_connection.nodes) {
      categoryCache.set(cat.name.toUpperCase(), cat.documentId);
    }
    console.log('[Import] Catégories PEG chargées:', Array.from(categoryCache.keys()));
  } catch (err) {
    console.error('[Import] Erreur chargement catégories:', err);
  }
  return categoryCache;
}

async function loadSizes(): Promise<Map<string, string>> {
  if (sizeCache) return sizeCache;
  sizeCache = new Map();
  try {
    const { sizes_connection } = await unwrapData(apiGetSizes()) as any;
    for (const s of sizes_connection.nodes) {
      sizeCache.set(s.name.toUpperCase(), s.documentId);
    }
    console.log('[Import] Tailles PEG chargées:', sizeCache.size);
  } catch (err) {
    console.error('[Import] Erreur chargement tailles:', err);
  }
  return sizeCache;
}

async function loadColors(): Promise<Map<string, string>> {
  if (colorCache) return colorCache;
  colorCache = new Map();
  try {
    const { colors_connection } = await unwrapData(apiGetColors()) as any;
    for (const c of colors_connection.nodes) {
      colorCache.set(c.name.toUpperCase(), c.documentId);
    }
    console.log('[Import] Couleurs PEG chargées:', colorCache.size);
  } catch (err) {
    console.error('[Import] Erreur chargement couleurs:', err);
  }
  return colorCache;
}

// ─── Matching : trouve la correspondance la plus proche ───

function findBestMatch(name: string, cache: Map<string, string>): string | null {
  const key = name.toUpperCase().trim();
  // Exact match
  if (cache.has(key)) return cache.get(key)!;
  // Partial match : le nom PEG contient le nom Imbretex ou inversement
  for (const [pegName, docId] of cache) {
    if (pegName.includes(key) || key.includes(pegName)) return docId;
  }
  return null;
}

// ─── Image download + upload ───

async function uploadImageFromUrl(url: string, filename: string): Promise<string | null> {
  try {
    console.log('[Import] Téléchargement image:', url);

    // Tentative 1 : fetch direct
    let blob: Blob | null = null;
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (response.ok) {
        blob = await response.blob();
      }
    } catch {
      console.log('[Import] CORS bloqué, tentative via no-cors...');
    }

    // Tentative 2 : créer une image canvas pour contourner CORS
    if (!blob) {
      try {
        blob = await new Promise<Blob | null>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d')?.drawImage(img, 0, 0);
            canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9);
          };
          img.onerror = () => resolve(null);
          img.src = url;
        });
      } catch {
        console.log('[Import] Canvas fallback échoué');
      }
    }

    if (!blob) {
      console.error('[Import] Impossible de télécharger l\'image');
      return null;
    }

    const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
    const uploaded = await apiUploadFile(file);
    console.log('[Import] Image uploadée:', uploaded.id, uploaded.url);
    return uploaded.id;
  } catch (err) {
    console.error('[Import] Erreur upload image:', err);
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
    const categoryName = getImbretexCategory(product);

    // 1. Category — match existante uniquement, PAS de création
    onProgress?.(`${ref}: catégorie...`);
    const cats = await loadCategories();
    const categoryDocId = categoryName ? findBestMatch(categoryName, cats) : null;
    console.log(`[Import] ${ref} catégorie "${categoryName}" → ${categoryDocId || 'aucun match'}`);

    // 2. Sizes — match existantes uniquement
    onProgress?.(`${ref}: tailles...`);
    const sizes = await loadSizes();
    const sizeNames = getUniqueSizes(product.variants);
    const sizeDocIds: string[] = [];
    for (const name of sizeNames) {
      const id = findBestMatch(name, sizes);
      if (id) sizeDocIds.push(id);
    }
    console.log(`[Import] ${ref} tailles: ${sizeNames.join(', ')} → ${sizeDocIds.length} matchées`);

    // 3. Colors — match existantes uniquement, dédupliquées
    onProgress?.(`${ref}: couleurs...`);
    const colorsMap = await loadColors();
    const imbretexColors = getUniqueColors(product.variants);
    const colorDocIdSet = new Set<string>();
    for (const { name } of imbretexColors) {
      const id = findBestMatch(name, colorsMap);
      if (id) colorDocIdSet.add(id);
    }
    const colorDocIds = Array.from(colorDocIdSet);
    console.log(`[Import] ${ref} couleurs: ${imbretexColors.map(c => c.name).join(', ')} → ${colorDocIds.length} matchées`);

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
    console.log(`[Import] ${ref} prix: ${price}€`);

    // 5. Image
    onProgress?.(`${ref}: image...`);
    const imageUrl = getBestImageUrl(product);
    let imageIds: number[] = [];
    if (imageUrl) {
      const ext = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
      const imgId = await uploadImageFromUrl(imageUrl, `${ref}.${ext}`);
      if (imgId) imageIds.push(Number(imgId));
    }
    console.log(`[Import] ${ref} images: ${imageIds.length > 0 ? imageIds.join(', ') : 'aucune'}`);

    // 6. Create product
    onProgress?.(`${ref}: création produit...`);
    const productData: any = {
      name: title || ref,
      description,
      active: true,
      inCatalogue: true,
      priceTiers: [{ minQuantity: 1, price }],
    };
    if (categoryDocId) productData.productCategory = categoryDocId;
    if (sizeDocIds.length > 0) productData.sizes = sizeDocIds;
    if (colorDocIds.length > 0) productData.colors = colorDocIds;
    if (imageIds.length > 0) productData.images = imageIds;

    console.log(`[Import] ${ref} payload:`, JSON.stringify(productData));
    await unwrapData(apiCreateProduct(productData));

    return { success: true, reference: ref };
  } catch (err: any) {
    console.error(`[Import] ${ref} ERREUR:`, err);
    return { success: false, reference: ref, error: err?.message || 'Erreur inconnue' };
  }
}

