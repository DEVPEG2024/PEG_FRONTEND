/*
 * Catalogue Master Print — panneau « Photos des produits » (ajout 21/11/2026).
 *
 * L'API Master Print n'a aucune photo. Pour chaque produit textile relié, PEG
 * cherche la même référence de fabricant dans le catalogue fournisseur (lu ici,
 * dans le navigateur, par le relais du backend Express), propose la
 * correspondance avec sa confiance, puis copie les photos dans le stockage PEG :
 * une par coloris (le formulaire client change de photo avec le coloris) et la
 * galerie de la fiche si elle est vide. Rien n'est jamais retiré d'une fiche.
 * Règles : src/utils/supplierPhotos.ts ; backend : master-print-photos.service.ts.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import type {
  MatchResult,
  PhotoPlan,
  PhotoProduct,
  SupplierEntry,
} from '@/@types/supplierPhotos';
import {
  apiGetPhotoProducts,
  attachPhotos,
  findPhotosFor,
  loadSupplierIndex,
  type IndexProgress,
} from '@/services/SupplierPhotosServices';
import { pegBackendFetch } from '@/services/PegBackendClient';
import {
  MATCH_LABELS,
  coverageLine,
  matchProduct,
  photoPlan,
} from '@/utils/supplierPhotos';
import { fmtDateTime } from '@/utils/masterPrintPrices';
import { masterPrintError, type Tone } from '@/utils/masterPrint';
import {
  Btn,
  Pill,
  card,
  muted,
} from '@/views/app/common/projects/details/components/masterPrint/ui';

const TONES: Record<MatchResult['level'], Tone> = {
  sure: {
    color: '#86efac',
    background: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.35)',
  },
  probable: {
    color: '#93c5fd',
    background: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.35)',
  },
  choose: {
    color: '#fcd34d',
    background: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.35)',
  },
  notFound: {
    color: '#fca5a5',
    background: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.3)',
  },
  noSupplierPhoto: {
    color: 'rgba(255,255,255,0.7)',
    background: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.12)',
  },
};

/** Vignette d'une photo fournisseur : lue par le relais (le JWT ne passe pas par un <img>). */
const SupplierThumb = ({
  url,
  size = 56,
}: {
  url: string | null;
  size?: number;
}) => {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    let objectUrl: string | null = null;
    pegBackendFetch(`/imbretex/image-proxy?url=${encodeURIComponent(url)}`)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (!alive || !b) return;
        objectUrl = URL.createObjectURL(b);
        setSrc(objectUrl);
      })
      .catch(() => null);
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '10px',
        background: '#f4f7fc',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {src && (
        <img
          src={src}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      )}
    </span>
  );
};

type Row = {
  product: PhotoProduct;
  match: MatchResult;
  chosen: SupplierEntry | null;
  plan: PhotoPlan | null;
};

const rowFor = (
  product: PhotoProduct,
  index: SupplierEntry[] | null,
  chosen?: SupplierEntry | null
): Row | null => {
  if (!index) return null;
  const match = matchProduct(product, index);
  // Choix déjà fait (photos posées) : la référence mémorisée est reprise.
  const remembered =
    match.candidates.find((c) => c.reference === product.photos.supplierRef) ??
    null;
  const entry = chosen === undefined ? (match.entry ?? remembered) : chosen;
  return {
    product,
    match,
    chosen: entry,
    plan: entry ? photoPlan(product, entry) : null,
  };
};

const progressLine = (p: IndexProgress | null) =>
  p
    ? `Lecture du catalogue fournisseur… page ${p.page} sur ${p.pages}`
    : 'Lecture du catalogue fournisseur…';

const doneLine = (p: PhotoProduct) => {
  const n = Object.keys(p.photos.byColor).length;
  if (!p.photos.updatedAt) return null;
  return `Photos ajoutées ${fmtDateTime(p.photos.updatedAt)}${n ? ` · ${n} coloris` : ''}${p.photos.supplierRef ? ` · réf. fournisseur ${p.photos.supplierRef}` : ''}`;
};

const ProductRow = ({
  row,
  busy,
  step,
  onChoose,
  onAttach,
}: {
  row: Row;
  busy: boolean;
  step: string | null;
  onChoose: (e: SupplierEntry | null) => void;
  onAttach: (addToGallery: boolean) => void;
}) => {
  const { product: p, match, chosen, plan } = row;
  const [addToGallery, setAddToGallery] = useState(false);
  const level = match.level === 'choose' && chosen ? 'choose' : match.level;
  const done = doneLine(p);
  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        minWidth: 0,
      }}
    >
      <SupplierThumb url={plan?.gallery[0] ?? chosen?.mainImage ?? null} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '6px 10px',
          }}
        >
          <Link
            to={`/admin/products/edit/${p.documentId}`}
            style={{
              color: '#fff',
              fontWeight: 700,
              fontSize: '13px',
              textDecoration: 'underline',
              overflowWrap: 'anywhere',
            }}
          >
            {p.name}
          </Link>
          <Pill tone={TONES[level]}>{MATCH_LABELS[level]}</Pill>
        </div>
        <p style={{ ...muted, fontSize: '12px', marginTop: '2px' }}>
          {[p.brand, p.sku ? `réf. ${p.sku}` : null]
            .filter(Boolean)
            .join(' · ')}
          {chosen && (
            <>
              {' '}
              → Imbretex {chosen.reference}
              {chosen.title ? ` · ${chosen.title}` : ''}
            </>
          )}
        </p>
        {match.level === 'choose' && (
          <select
            aria-label={`Produit du fournisseur pour ${p.name}`}
            value={chosen?.reference ?? ''}
            onChange={(e) =>
              onChoose(
                match.candidates.find((c) => c.reference === e.target.value) ??
                  null
              )
            }
            style={{
              marginTop: '6px',
              maxWidth: '100%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '12.5px',
              padding: '6px 8px',
            }}
          >
            <option value="">
              Choisir parmi {match.candidates.length} produits…
            </option>
            {match.candidates.map((c) => (
              <option key={c.reference} value={c.reference}>
                {c.reference} · {c.title}
              </option>
            ))}
          </select>
        )}
        {plan && (
          <p style={{ ...muted, fontSize: '12px', marginTop: '4px' }}>
            {plan.total
              ? `Coloris couverts : ${plan.covered} sur ${plan.total}`
              : 'Photo du produit'}
            {plan.approx.length > 0 &&
              ` (dont ${plan.approx.length} par teinte proche)`}
            {' · '}
            {p.imageCount
              ? `la fiche a déjà ${p.imageCount} photo${p.imageCount > 1 ? 's' : ''} : elle ne sera pas remplacée`
              : 'fiche sans photo : la galerie sera posée'}
          </p>
        )}
        {match.level === 'notFound' && (
          <p style={{ ...muted, fontSize: '12px', marginTop: '4px' }}>
            Aucune référence {p.sku || ''} de cette marque chez le fournisseur.
          </p>
        )}
        {p.error && (
          <p style={{ ...muted, fontSize: '12px', color: '#fca5a5' }}>
            {p.error}
          </p>
        )}
        {done && (
          <p
            style={{
              ...muted,
              fontSize: '12px',
              color: '#86efac',
              marginTop: '4px',
            }}
          >
            {done}
          </p>
        )}
        {plan && plan.gallery.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '8px 12px',
              marginTop: '8px',
            }}
          >
            <Btn
              variant="primary"
              disabled={busy}
              onClick={() => onAttach(addToGallery)}
            >
              {busy ? step || 'Copie des photos…' : 'Ajouter les photos'}
            </Btn>
            {p.imageCount > 0 && (
              <label
                style={{
                  ...muted,
                  fontSize: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={addToGallery}
                  onChange={(e) => setAddToGallery(e.target.checked)}
                />
                Ajouter aussi à la galerie de la fiche
              </label>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ProductPhotosPanel = () => {
  const [products, setProducts] = useState<PhotoProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState<SupplierEntry[] | null>(null);
  const [progress, setProgress] = useState<IndexProgress | null>(null);
  const [reading, setReading] = useState(false);
  const [chosen, setChosen] = useState<Record<string, SupplierEntry | null>>(
    {}
  );
  const [busy, setBusy] = useState<Record<string, string | null>>({});
  const [open, setOpen] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const { data } = await apiGetPhotoProducts();
      setProducts(data.products);
      setError(null);
    } catch (e) {
      setError(masterPrintError(e, 'Produits reliés illisibles.'));
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const search = async () => {
    setReading(true);
    setOpen(true);
    try {
      setIndex(await loadSupplierIndex(setProgress));
    } catch (e) {
      toast.error(
        `Catalogue fournisseur illisible : ${e instanceof Error ? e.message : 'réessayez'}.`
      );
    } finally {
      setReading(false);
    }
  };

  const rows = useMemo(
    () =>
      (products || [])
        .map((p) => rowFor(p, index, chosen[p.documentId]))
        .filter((r): r is Row => !!r),
    [products, index, chosen]
  );
  const textileRows = rows.filter((r) => r.match.level !== 'noSupplierPhoto');
  const otherRows = rows.filter((r) => r.match.level === 'noSupplierPhoto');
  const sureTodo = textileRows.filter(
    (r) =>
      r.match.level === 'sure' &&
      r.plan?.gallery.length &&
      !r.product.photos.updatedAt
  );

  const attach = async (row: Row, addToGallery: boolean) => {
    if (!row.chosen || !row.plan) return;
    const id = row.product.documentId;
    setBusy((b) => ({ ...b, [id]: 'Copie des photos…' }));
    try {
      const r = await attachPhotos(row.product, row.chosen, row.plan, {
        addToGallery,
        onStep: (n, total) =>
          setBusy((b) => ({ ...b, [id]: `Copie ${n} sur ${total}…` })),
      });
      toast.success(
        `Photos ajoutées à « ${row.product.name} »${r.galleryApplied ? ' (galerie posée)' : r.galleryKept ? ' (galerie existante gardée)' : ''}.`
      );
      await loadProducts();
    } catch (e) {
      toast.error(
        masterPrintError(
          e,
          e instanceof Error
            ? `Photos non ajoutées : ${e.message}.`
            : 'Photos non ajoutées.'
        )
      );
    } finally {
      setBusy((b) => ({ ...b, [id]: null }));
    }
  };

  const attachAllSure = async () => {
    for (const r of sureTodo) await attach(r, false);
  };

  if (!products) {
    return error ? (
      <div style={{ ...card, padding: '14px 16px' }}>
        <p style={{ ...muted, color: '#fca5a5' }}>{error}</p>
      </div>
    ) : null;
  }

  return (
    <section style={{ ...card, padding: '14px 16px' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        <div style={{ minWidth: 0, flex: '1 1 320px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
            Photos des produits
          </h2>
          <p style={{ ...muted, marginTop: '4px' }}>
            {reading
              ? progressLine(progress)
              : index
                ? coverageLine(rows.map((r) => r.match.level))
                : `Master Print ne fournit pas de photo. PEG retrouve celles du fabricant (même marque, même référence) et les copie dans son stockage — une par coloris.`}
          </p>
          {!products.length && (
            <p style={{ ...muted, marginTop: '2px' }}>
              Aucun produit relié à Master Print pour l’instant.
            </p>
          )}
        </div>
        <span style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap' }}>
          {index && sureTodo.length > 0 && (
            <Btn
              onClick={attachAllSure}
              disabled={Object.values(busy).some(Boolean)}
            >
              Ajouter toutes les correspondances sûres ({sureTodo.length})
            </Btn>
          )}
          <Btn
            variant="primary"
            onClick={index ? () => setOpen(!open) : search}
            disabled={reading || !products.length}
          >
            {reading
              ? 'Recherche…'
              : index
                ? open
                  ? 'Masquer'
                  : 'Voir les correspondances'
                : 'Chercher les photos'}
          </Btn>
        </span>
      </div>

      {reading && progress && (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.pages}
          aria-valuenow={progress.page}
          style={{
            marginTop: '10px',
            height: '6px',
            borderRadius: '6px',
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.round((progress.page / progress.pages) * 100)}%`,
              height: '100%',
              background: '#8b7dff',
              transition: 'width .2s ease',
            }}
          />
        </div>
      )}

      {open && index && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '12px',
          }}
        >
          {textileRows.map((r) => (
            <ProductRow
              key={r.product.documentId}
              row={r}
              busy={!!busy[r.product.documentId]}
              step={busy[r.product.documentId] ?? null}
              onChoose={(e) =>
                setChosen((c) => ({ ...c, [r.product.documentId]: e }))
              }
              onAttach={(add) => attach(r, add)}
            />
          ))}
          {otherRows.length > 0 && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px dashed rgba(255,255,255,0.1)',
              }}
            >
              <p
                style={{
                  ...muted,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.8)',
                }}
              >
                Pas de photo fabricant : demander à Master Print ou créer un
                visuel
              </p>
              <ul style={{ ...muted, margin: '6px 0 0', paddingLeft: '18px' }}>
                {otherRows.map((r) => (
                  <li key={r.product.documentId}>
                    <Link
                      to={`/admin/products/edit/${r.product.documentId}`}
                      style={{
                        color: 'rgba(255,255,255,0.8)',
                        textDecoration: 'underline',
                      }}
                    >
                      {r.product.name}
                    </Link>
                    {r.product.imageCount
                      ? ` · ${r.product.imageCount} photo${r.product.imageCount > 1 ? 's' : ''}`
                      : ' · sans photo'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

/**
 * Après l'import d'un textile : « Ajouter les photos du fabricant » pour ce seul
 * produit. Correspondance sûre ou probable → photos copiées tout de suite ;
 * sinon, renvoi au panneau « Photos des produits ».
 */
export const ImportPhotosButton = ({
  productDocumentId,
}: {
  productDocumentId: string;
}) => {
  const [state, setState] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const run = async () => {
    setState('Lecture du catalogue fournisseur…');
    setResult(null);
    try {
      const { product, match, plan } = await findPhotosFor(
        productDocumentId,
        (p) => setState(progressLine(p))
      );
      if (!product || !match) {
        setResult('Produit introuvable parmi les produits reliés.');
        return;
      }
      if (!match.entry || !plan?.gallery.length) {
        setResult(
          match.level === 'choose'
            ? `${match.candidates.length} produits possibles chez le fournisseur : choisissez dans le panneau « Photos des produits ».`
            : 'Aucune photo trouvée chez le fournisseur pour cette référence.'
        );
        return;
      }
      const r = await attachPhotos(product, match.entry, plan, {
        onStep: (n, total) => setState(`Copie des photos ${n} sur ${total}…`),
      });
      setResult(
        `${plan.covered ? `${plan.covered} coloris sur ${plan.total} illustrés` : 'Photo ajoutée'}${r.galleryApplied ? ', galerie posée' : ''} (correspondance ${MATCH_LABELS[match.level].toLowerCase()}, réf. ${match.entry.reference}).`
      );
    } catch (e) {
      setResult(
        masterPrintError(
          e,
          e instanceof Error ? e.message : 'Recherche impossible.'
        )
      );
    } finally {
      setState(null);
    }
  };
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        marginTop: '6px',
      }}
    >
      <span>
        <Btn onClick={run} disabled={!!state}>
          {state || 'Ajouter les photos du fabricant'}
        </Btn>
      </span>
      {result && <p style={{ ...muted, fontSize: '12px' }}>{result}</p>}
    </div>
  );
};

export default ProductPhotosPanel;
