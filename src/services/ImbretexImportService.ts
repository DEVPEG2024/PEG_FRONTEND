/**
 * Service d'import de produits Imbretex → PEG
 * Catégorie + tailles + couleurs + prix + image (via proxy backend)
 */

import type { ImbretexProduct, ImbretexVariant } from '@/@types/imbretex';
import { apiCreateProduct } from './ProductServices';
import { apiGetSizes } from './SizeServices';
import { apiGetColors } from './ColorServices';
import { apiGetProductCategories, GetProductCategoriesResponse } from './ProductCategoryServices';
import { apiGetImbretexPriceStockByRef } from './ImbretexService';
import { apiUploadFile } from './FileServices';
import { unwrapData } from '@/utils/serviceHelper';

const PEG_BACKEND_BASE = import.meta.env.DEV
  ? 'http://localhost:3000'
  : '/peg-api';

// ─── Caches (chargés une fois par session d'import) ───

let cats: Map<string, string> | null = null;
let szs: Map<string, string> | null = null;
let cols: Map<string, string> | null = null;

export function resetImportCaches() { cats = null; szs = null; cols = null; }

async function getCategories(): Promise<Map<string, string>> {
  if (cats) return cats;
  cats = new Map();
  try {
    const r = await unwrapData(apiGetProductCategories()) as any;
    for (const c of r.productCategories_connection.nodes) {
      cats.set(c.name.toUpperCase().trim(), c.documentId);
    }
  } catch (e) { console.error('[Import] Erreur chargement catégories:', e); }
  console.log('[Import] Catégories PEG:', Array.from(cats.keys()));
  return cats;
}

async function getSizes(): Promise<Map<string, string>> {
  if (szs) return szs;
  szs = new Map();
  try {
    const r = await unwrapData(apiGetSizes()) as any;
    for (const s of r.sizes_connection.nodes) {
      szs.set(s.name.toUpperCase().trim(), s.documentId);
    }
  } catch (e) { console.error('[Import] Erreur chargement tailles:', e); }
  console.log('[Import] Tailles PEG:', Array.from(szs.keys()));
  return szs;
}

async function getColors(): Promise<Map<string, string>> {
  if (cols) return cols;
  cols = new Map();
  try {
    const r = await unwrapData(apiGetColors()) as any;
    for (const c of r.colors_connection.nodes) {
      cols.set(c.name.toUpperCase().trim(), c.documentId);
    }
  } catch (e) { console.error('[Import] Erreur chargement couleurs:', e); }
  console.log('[Import] Couleurs PEG:', Array.from(cols.keys()));
  return cols;
}

// ─── Mapping catégories Imbretex → PEG ───

const CATEGORY_MAP: Record<string, string> = {
  'CASQUETTE': 'CASQUETTE',
  'BONNET': 'VÊTEMENT PERSONNALISÉ',
  'ACCESSOIRES HIVER': 'ACCESSOIRES HIVER',
  'BIO': 'VÊTEMENT PERSONNALISÉ',
  'RECYCLÉ': 'VÊTEMENT PERSONNALISÉ',
  'FIN DE SERIE': 'VÊTEMENT PERSONNALISÉ',
};

// ─── Match ───

function match(name: string, cache: Map<string, string>): string | null {
  const k = name.toUpperCase().trim();
  if (cache.has(k)) return cache.get(k)!;
  for (const [pegName, id] of cache) {
    if (pegName.includes(k) || k.includes(pegName)) return id;
  }
  return null;
}

function matchCategory(imbretexCategory: string, cache: Map<string, string>): string | null {
  const k = imbretexCategory.toUpperCase().trim();
  // D'abord le mapping explicite
  const mapped = CATEGORY_MAP[k];
  if (mapped && cache.has(mapped)) return cache.get(mapped)!;
  // Sinon match direct
  return match(imbretexCategory, cache);
}

// ─── Extraction données Imbretex ───

function getCategory(p: ImbretexProduct): string {
  for (const v of p.variants) {
    const c = v.categories?.[0]?.categories?.fr;
    if (c) return c;
  }
  return '';
}

function getTitle(v: ImbretexVariant): string {
  return v.title?.fr || v.title?.en || '';
}

function extractSizes(variants: ImbretexVariant[]): string[] {
  const s = new Set<string>();
  let hasZeroOnly = true;
  for (const v of variants) {
    const a = v.attributes?.find((a) => a.type === 'sizes');
    if (a?.value && a.value !== '0') {
      s.add(a.value);
      hasZeroOnly = false;
    }
  }
  // Si toutes les variantes ont size=0, c'est taille unique
  if (hasZeroOnly && variants.length > 0) s.add('TAILLE UNIQUE');
  return Array.from(s);
}

function extractColors(variants: ImbretexVariant[]): string[] {
  const s = new Set<string>();
  for (const v of variants) {
    const a = v.attributes?.find((a) => a.type === 'color');
    if (a?.value) s.add(a.value);
  }
  return Array.from(s);
}

// ─── Image : proxy backend → upload Strapi ───

function fixImageUrl(url: string): string {
  return url.replace('admin.preprod.imbretex-upgrade.hegyd.net', 'www.imbretex.fr');
}

function getBestImageUrl(p: ImbretexProduct): string | null {
  if (Array.isArray(p.images) && p.images.length > 0) return fixImageUrl(p.images[0].url);
  if (!Array.isArray(p.images) && p.images?.url) return fixImageUrl(p.images.url);
  for (const v of p.variants) {
    if (v.images?.length > 0) return fixImageUrl(v.images[0].url);
  }
  return null;
}

async function fetchImageViaProxy(imageUrl: string): Promise<File | null> {
  try {
    const proxyUrl = `${PEG_BACKEND_BASE}/imbretex/image-proxy?url=${encodeURIComponent(imageUrl)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    const ext = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
    const name = `imbretex-${Date.now()}.${ext}`;
    return new File([blob], name, { type: blob.type || 'image/jpeg' });
  } catch (err) {
    console.warn('[Import] Erreur proxy image:', err);
    return null;
  }
}

async function uploadImbretexImage(product: ImbretexProduct): Promise<number | null> {
  const url = getBestImageUrl(product);
  if (!url) return null;
  const file = await fetchImageViaProxy(url);
  if (!file) return null;
  try {
    const pegFile = await apiUploadFile(file);
    const numericId = Number(pegFile.id);
    console.log(`[Import] Image uploadée: id=${numericId}, docId=${pegFile.documentId}`);
    return numericId || null;
  } catch (err) {
    console.warn('[Import] Erreur upload Strapi:', err);
    return null;
  }
}

// ─── Import principal ───

export type ImportResult = { success: boolean; reference: string; error?: string };

export async function importImbretexProduct(product: ImbretexProduct): Promise<ImportResult> {
  const ref = product.reference;
  const mv = product.variants[0];
  if (!mv) return { success: false, reference: ref, error: 'Pas de variante' };

  try {
    // Charger les données PEG (une seule fois)
    const [catMap, sizeMap, colorMap] = await Promise.all([getCategories(), getSizes(), getColors()]);

    // Catégorie
    const catName = getCategory(product);
    const catId = catName ? matchCategory(catName, catMap) : null;
    console.log(`[Import] ${ref} catégorie: "${catName}" → ${catId || 'aucun match'}`);

    // Tailles
    const sizeNames = extractSizes(product.variants);
    const sizeIds = [...new Set(sizeNames.map(n => match(n, sizeMap)).filter(Boolean))] as string[];
    console.log(`[Import] ${ref} tailles: [${sizeNames}] → ${sizeIds.length} matchées`);

    // Couleurs
    const colorNames = extractColors(product.variants);
    const colorIds = [...new Set(colorNames.map(n => match(n, colorMap)).filter(Boolean))] as string[];
    console.log(`[Import] ${ref} couleurs: [${colorNames}] → ${colorIds.length} matchées`);

    // Image
    const imageDocId = await uploadImbretexImage(product);
    console.log(`[Import] ${ref} image: ${imageDocId || 'aucune'}`);

    // Prix
    let price = 0;
    try {
      const pd = await apiGetImbretexPriceStockByRef(ref);
      if (Array.isArray(pd.products) && pd.products.length > 0) {
        price = parseFloat(pd.products[0].price) || 0;
      }
    } catch { /* */ }
    console.log(`[Import] ${ref} prix: ${price}€`);

    // Création
    const data: Record<string, any> = {
      name: getTitle(mv) || ref,
      description: mv.description?.fr || '',
      active: true,
      inCatalogue: true,
      priceTiers: [{ minQuantity: 1, price }],
    };
    if (catId) data.productCategory = catId;
    if (sizeIds.length) data.sizes = sizeIds;
    if (colorIds.length) data.colors = colorIds;
    if (imageDocId) data.images = [imageDocId];

    console.log(`[Import] ${ref} ENVOI:`, JSON.stringify(data));

    const result = await apiCreateProduct(data as any);
    const response = result.data;
    console.log(`[Import] ${ref} RÉPONSE:`, JSON.stringify(response));

    if ((response as any).errors?.length) {
      const msg = (response as any).errors[0].message;
      console.error(`[Import] ${ref} ERREUR GRAPHQL:`, msg);
      return { success: false, reference: ref, error: msg };
    }

    return { success: true, reference: ref };
  } catch (err: any) {
    console.error(`[Import] ${ref} ERREUR:`, err);
    return { success: false, reference: ref, error: err?.message || String(err) };
  }
}
