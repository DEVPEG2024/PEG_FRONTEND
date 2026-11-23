/**
 * Photos des produits Master Print retrouvées chez le fabricant (admin seulement).
 *
 * - Catalogue fournisseur lu DANS LE NAVIGATEUR de l'admin, par le relais du
 *   backend Express (`/imbretex/api/*`, JWT admin) : aucun secret côté front ni
 *   côté Strapi. Index compact gardé en mémoire pour la session.
 * - Photos téléchargées par le relais `/imbretex/image-proxy`, puis copiées dans
 *   le stockage PEG (upload habituel) : jamais de lien vers le fournisseur.
 * - Rattachement : peg_strapi `master-print-photos.service.ts`.
 */
import ApiService from './ApiService';
import { apiGetImbretexProducts } from './ImbretexService';
import { apiUploadFile } from './FileServices';
import { pegBackendFetch } from './PegBackendClient';
import type {
  MatchResult,
  PhotoPlan,
  PhotoProduct,
  PhotoProductsResponse,
  SavePhotosBody,
  SavePhotosResult,
  SupplierEntry,
} from '@/@types/supplierPhotos';
import {
  indexSupplierProduct,
  matchProduct,
  photoPlan,
} from '@/utils/supplierPhotos';

const enc = encodeURIComponent;

export const apiGetPhotoProducts = () =>
  ApiService.fetchData<PhotoProductsResponse>({
    url: '/master-print/admin/photos',
    method: 'get',
  });

export const apiSavePhotos = (
  productDocumentId: string,
  body: SavePhotosBody
) =>
  ApiService.fetchData<SavePhotosResult>({
    url: `/master-print/admin/photos/${enc(productDocumentId)}`,
    method: 'post',
    data: body,
  });

// ── Index du catalogue fournisseur ───────────────────────────────────────────

const PER_PAGE = 50;
const PARALLEL = 4;
const INDEX_TTL_MS = 6 * 60 * 60 * 1000;
let indexCache: { at: number; entries: SupplierEntry[] } | null = null;
let indexLoading: Promise<SupplierEntry[]> | null = null;

export type IndexProgress = { page: number; pages: number };

async function readPage(page: number) {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await apiGetImbretexProducts({ page, perPage: PER_PAGE });
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw last instanceof Error ? last : new Error(`page ${page} illisible`);
}

/** Catalogue fournisseur complet (≈ 70 pages de 50), lu une fois par session. */
export function loadSupplierIndex(
  onProgress?: (p: IndexProgress) => void
): Promise<SupplierEntry[]> {
  if (indexCache && Date.now() - indexCache.at < INDEX_TTL_MS)
    return Promise.resolve(indexCache.entries);
  if (indexLoading) return indexLoading;
  indexLoading = (async () => {
    const first = await readPage(1);
    const pages = Math.max(
      1,
      Math.min(200, Number(first.totalNumberPage) || 1)
    );
    const entries: SupplierEntry[] = (first.products || []).map(
      indexSupplierProduct
    );
    let done = 1;
    onProgress?.({ page: done, pages });
    const queue = Array.from({ length: pages - 1 }, (_, i) => i + 2);
    const worker = async () => {
      for (let page = queue.shift(); page; page = queue.shift()) {
        const res = await readPage(page);
        for (const p of res.products || [])
          entries.push(indexSupplierProduct(p));
        done += 1;
        onProgress?.({ page: done, pages });
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(PARALLEL, queue.length) }, worker)
    );
    indexCache = { at: Date.now(), entries };
    return entries;
  })();
  return indexLoading.finally(() => {
    indexLoading = null;
  });
}

export const supplierIndexReady = () =>
  !!indexCache && Date.now() - indexCache.at < INDEX_TTL_MS;

// ── Copie des photos dans le stockage PEG ────────────────────────────────────

async function copyImage(url: string, name: string): Promise<number> {
  const res = await pegBackendFetch(`/imbretex/image-proxy?url=${enc(url)}`);
  if (!res.ok) throw new Error(`photo illisible (${res.status})`);
  const blob = await res.blob();
  if (!/^image\//.test(blob.type || 'image/jpeg'))
    throw new Error('le fichier reçu n’est pas une image');
  const ext = (url.split('?')[0].split('.').pop() || 'jpg')
    .toLowerCase()
    .slice(0, 5);
  const file = new File(
    [blob],
    `${name}.${/^[a-z0-9]+$/.test(ext) ? ext : 'jpg'}`,
    {
      type: blob.type || 'image/jpeg',
    }
  );
  const saved = await apiUploadFile(file);
  const id = Number(saved?.id);
  if (!Number.isInteger(id) || id <= 0)
    throw new Error('envoi de la photo refusé');
  return id;
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'produit';

/**
 * Copie les photos d'un plan (une par URL, même si plusieurs coloris la
 * partagent) puis les rattache au produit. Le nom de fichier ne cite que le
 * produit PEG et le coloris — jamais le fournisseur.
 */
export async function attachPhotos(
  product: PhotoProduct,
  entry: SupplierEntry,
  plan: PhotoPlan,
  opts: {
    addToGallery?: boolean;
    onStep?: (done: number, total: number) => void;
  } = {}
): Promise<SavePhotosResult> {
  const urls = [...new Set([...plan.gallery, ...Object.values(plan.byColor)])];
  const codeOf = new Map<string, string>();
  for (const [code, url] of Object.entries(plan.byColor))
    if (!codeOf.has(url)) codeOf.set(url, code);
  const idOf = new Map<string, number>();
  let done = 0;
  for (const url of urls) {
    idOf.set(
      url,
      await copyImage(
        url,
        `${slug(product.name)}-${codeOf.get(url) || 'photo'}`
      )
    );
    done += 1;
    opts.onStep?.(done, urls.length);
  }
  const byColor: Record<string, number> = {};
  for (const [code, url] of Object.entries(plan.byColor))
    byColor[code] = idOf.get(url)!;
  const { data } = await apiSavePhotos(product.documentId, {
    gallery: plan.gallery.map((u) => idOf.get(u)!),
    byColor,
    supplierRef: entry.reference || null,
    ...(opts.addToGallery ? { addToGallery: true } : {}),
  });
  return data;
}

/** Recherche pour un seul produit (bouton après l'import) : correspondance + plan. */
export async function findPhotosFor(
  productDocumentId: string,
  onProgress?: (p: IndexProgress) => void
): Promise<{
  product: PhotoProduct | null;
  match: MatchResult | null;
  plan: PhotoPlan | null;
}> {
  const [{ data }, index] = await Promise.all([
    apiGetPhotoProducts(),
    loadSupplierIndex(onProgress),
  ]);
  const product =
    data.products.find((p) => p.documentId === productDocumentId) || null;
  if (!product) return { product: null, match: null, plan: null };
  const match = matchProduct(product, index);
  const plan = match.entry ? photoPlan(product, match.entry) : null;
  return { product, match, plan };
}

/** Photos du modèle (catalogue public Master Print, photos Falk & Ross) copiées par le serveur dans la fiche PEG. */
export const apiAttachModelPhotos = (productDocumentId: string) =>
  ApiService.fetchData<
    SavePhotosResult & { copied: number; colorPhotos: number }
  >({
    url: `/master-print/admin/photos/${encodeURIComponent(productDocumentId)}/model`,
    method: 'post',
    timeout: 60000,
  });
