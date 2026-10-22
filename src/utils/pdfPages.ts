// Pages d'un PDF en images, dans le navigateur (aperçu du BAT : toutes les
// pages côte à côte, demande du 22/10/2026). pdfjs est chargé à la demande
// (dynamic import) : seul l'écran qui affiche un PDF télécharge la lib.

type Pdfjs = typeof import('pdfjs-dist');

let pdfjsReady: Promise<Pdfjs> | null = null;

/** pdfjs + son worker, configuré une seule fois (aussi utilisé par pdfText.ts). */
export function loadPdfjs(): Promise<Pdfjs> {
  if (!pdfjsReady) {
    pdfjsReady = (async () => {
      const pdfjs = await import('pdfjs-dist');
      const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjs;
    })().catch((err) => {
      pdfjsReady = null;
      throw err;
    });
  }
  return pdfjsReady;
}

export type PdfPageImage = { url: string; width: number; height: number };

/**
 * Rend les `maxPages` premières pages, chacune à `width` px de large (net sur
 * un écran haute densité pour un aperçu de ~600 px). Les `url` sont des
 * `blob:` : à libérer avec `revokePdfPages` quand l'aperçu disparaît.
 * Le fichier est lu en CORS (bucket S3 : app.mypeg.fr et int autorisés) ;
 * `cache: 'reload'` évite une copie en cache sans en-têtes CORS.
 */
export async function renderPdfPages(
  url: string,
  { maxPages = 12, width = 1200 }: { maxPages?: number; width?: number } = {}
): Promise<{ pages: PdfPageImage[]; total: number }> {
  const pdfjs = await loadPdfjs();
  const res = await fetch(url, { mode: 'cors', cache: 'reload' });
  if (!res.ok) throw new Error(`PDF inaccessible (${res.status})`);
  const data = await res.arrayBuffer();
  const task = pdfjs.getDocument({ data });
  const pdf = await task.promise;
  const pages: PdfPageImage[] = [];
  try {
    const count = Math.min(pdf.numPages, maxPages);
    for (let i = 1; i <= count; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) throw new Error('Rendu de page impossible');
      pages.push({ url: URL.createObjectURL(blob), width: canvas.width, height: canvas.height });
      page.cleanup();
    }
    return { pages, total: pdf.numPages };
  } catch (err) {
    revokePdfPages(pages);
    throw err;
  } finally {
    task.destroy();
  }
}

export function revokePdfPages(pages: PdfPageImage[]): void {
  for (const p of pages) URL.revokeObjectURL(p.url);
}
