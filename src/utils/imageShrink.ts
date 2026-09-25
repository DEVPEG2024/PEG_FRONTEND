// Réduction d'image dans le navigateur, avant envoi.
//
// Une photo de téléphone pèse 3 à 15 Mo : envoyée telle quelle, elle alourdit
// chaque affichage et son envoi en 4G peut dépasser les 30 s après lesquelles
// Heroku coupe la requête. Au-delà de `maxBytes`, l'image est redimensionnée
// (plus grand côté ≤ `maxSide`) et réencodée en JPEG ; en deçà, elle part telle
// quelle, format et qualité d'origine.

export type ShrinkOptions = {
  /** Poids visé ; une image déjà plus légère n'est pas touchée. */
  maxBytes?: number;
  /** Plus grand côté, en pixels, après réduction. */
  maxSide?: number;
  quality?: number;
};

const DEFAULTS: Required<ShrinkOptions> = {
  maxBytes: 2 * 1024 * 1024,
  maxSide: 2560,
  quality: 0.86,
};

/** Dimensions qui tiennent dans un carré de `maxSide`, proportions gardées, jamais agrandies. */
export function fitWithin(
  width: number,
  height: number,
  maxSide: number
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const k = maxSide / longest;
  return {
    width: Math.max(1, Math.round(width * k)),
    height: Math.max(1, Math.round(height * k)),
  };
}

async function decode(
  file: File
): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file);
      return {
        source: bmp,
        width: bmp.width,
        height: bmp.height,
        close: () => bmp.close(),
      };
    } catch {
      /* repli sur <img> ci-dessous */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('image illisible'));
      el.src = url;
    });
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      close: () => URL.revokeObjectURL(url),
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

const toBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality)
  );

/**
 * Renvoie `file` tel quel s'il pèse moins de `maxBytes`, sinon une version
 * JPEG réduite. Lève une erreur si l'image ne peut pas être lue (format non pris
 * en charge par le navigateur).
 */
export async function shrinkImage(
  file: File,
  options: ShrinkOptions = {}
): Promise<File> {
  const { maxBytes, maxSide, quality } = { ...DEFAULTS, ...options };
  if (file.size <= maxBytes) return file;

  const img = await decode(file);
  try {
    let { width, height } = fitWithin(img.width, img.height, maxSide);
    let q = quality;
    let best: Blob | null = null;
    // Quelques essais : qualité d'abord, puis dimensions si besoin
    for (let attempt = 0; attempt < 6; attempt++) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) break;
      ctx.fillStyle = '#ffffff'; // fond des zones transparentes (le JPEG n'en a pas)
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img.source, 0, 0, width, height);
      const blob = await toBlob(canvas, q);
      if (!blob) break;
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= maxBytes) break;
      if (q > 0.7) q -= 0.08;
      else
        ({ width, height } = fitWithin(
          width,
          height,
          Math.round(Math.max(width, height) * 0.8)
        ));
    }
    if (!best || best.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([best], name, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } finally {
    img.close();
  }
}
