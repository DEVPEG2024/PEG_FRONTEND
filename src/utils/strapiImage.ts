// Images téléversées dans Strapi : `srcset` à partir des tailles qu'il génère
// (thumbnail, small, medium, large).
//
// ⚠️ Strapi recompresse mal : une version « réduite » est parfois PLUS LOURDE
// que l'original (mesuré en prod le 24/09/2026 : Dépliant A5 original 70 Ko,
// version 750px 179 Ko ; Voix-off 270 Ko → 590 Ko). Une version n'est donc
// proposée que si elle est plus petite ET plus légère que l'original, et
// l'original fait toujours partie des candidats : le navigateur ne peut jamais
// télécharger plus lourd que l'original.

type StrapiImageFormat = { url?: string; width?: number; size?: number };

export type StrapiImage = {
  url?: string;
  width?: number | null;
  size?: number | null;
  formats?: unknown;
};

export function buildImageSources(
  image?: StrapiImage | null
): { src: string; srcSet?: string } | null {
  const src = image?.url;
  if (!src) return null;
  const formats = image?.formats;
  const originalWidth = image?.width ?? 0;
  if (!formats || typeof formats !== 'object' || originalWidth <= 0)
    return { src };

  const originalSize = image?.size ?? 0;
  const seenWidths = new Set<number>([originalWidth]);
  const candidates: { url: string; width: number }[] = [];
  for (const format of Object.values(
    formats as Record<string, StrapiImageFormat>
  )) {
    const width = format?.width;
    if (!format?.url || typeof width !== 'number' || width <= 0) continue;
    if (width >= originalWidth || seenWidths.has(width)) continue;
    if (
      originalSize > 0 &&
      typeof format.size === 'number' &&
      format.size >= originalSize
    )
      continue;
    seenWidths.add(width);
    candidates.push({ url: format.url, width });
  }
  if (candidates.length === 0) return { src };
  candidates.sort((a, b) => a.width - b.width);
  candidates.push({ url: src, width: originalWidth });
  return {
    src,
    srcSet: candidates.map((c) => `${c.url} ${c.width}w`).join(', '),
  };
}
