/*
 * Catalogue Master Print (menu Fournisseurs) — ajout 19/11/2026.
 *
 * Les 2 300 modèles textile, le DTF, le grand format, les adhésifs et la PLV de
 * Master Print, aux prix d'achat du compte NOVA. Recherche, fiche produit
 * (coloris, tailles, emplacements de marquage, prix par quantité) et import
 * dans PEG, comme pour Imbretex : le produit importé reste INVISIBLE des clients
 * (`inCatalogue: false`) tant que l'admin ne le met pas en vente, et il sait déjà
 * partir chez Master Print (correspondance mémorisée).
 * L'API Master Print ne fournit pas de photo : à ajouter sur la fiche produit.
 * Backend : peg_strapi `master-print.service.ts` (catalogPage, catalogProduct,
 * catalogPriceGrid, importCatalogProduct).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { HiArrowLeft, HiCheckCircle, HiSearch } from 'react-icons/hi';
import type {
  MpCatalogDetails,
  MpCatalogResult,
  MpMarking,
  MpPriceGridTier,
} from '@/@types/masterPrint';
import {
  apiGetMasterPrintCatalogDetails,
  apiGetMasterPrintPriceGrid,
  apiGetPegCategoriesForMasterPrint,
  apiImportMasterPrintProduct,
  apiSearchMasterPrintCatalog,
} from '@/services/MasterPrintServices';
import {
  defaultImportColors,
  defaultMarkings,
  fmtEur,
  isMasterPrintMissing,
  masterPrintError,
  sizesForColor,
  suggestCategory,
  tierRows,
} from '@/utils/masterPrint';
import useResponsive from '@/utils/hooks/useResponsive';
import PurchasePricesPanel from './PurchasePricesPanel';
import ProductPhotosPanel, { ImportPhotosButton } from './ProductPhotosPanel';
// Catégories Master Print (libellés à jour) et rangement automatique à l'import.
import { pickImportCategory } from '@/utils/masterPrintQuote';
import useMpCategories from './useMpCategories';
import MarkingsEditor from '@/views/app/common/projects/details/components/masterPrint/MarkingsEditor';
import CatalogStock from './CatalogStock';
import {
  Btn,
  Field,
  Issues,
  Pill,
  card,
  grid,
  input,
  label,
  muted,
  sectionTitle,
} from '@/views/app/common/projects/details/components/masterPrint/ui';
import ServiceStatusBanner from './ServiceStatusBanner';
import CatalogProductCard from './catalog/CatalogProductCard';
import { apiGetPegCardProducts } from '@/services/MasterPrintCardsServices';
import {
  type PegCardInfo,
  cardPegId,
  idsToFetch,
  pegCardInfo,
} from '@/utils/masterPrintCards';

const PAGE = 50;
const MARKUP_KEY = 'master_print_markup';

const MUTED_TONE = {
  color: 'rgba(255,255,255,0.7)',
  background: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.12)',
};

const readMarkup = () => {
  try {
    const n = parseFloat(localStorage.getItem(MARKUP_KEY) || '');
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
};

/** Fiche d'un produit Master Print : description, coloris, tailles, prix par quantité, import. */
const ProductSheet = ({
  details,
  categories,
  onImported,
}: {
  details: MpCatalogDetails;
  categories: Array<{ documentId: string; name: string }>;
  onImported: () => void;
}) => {
  const p = details.product;
  const [colors, setColors] = useState<string[]>(() =>
    defaultImportColors(details)
  );
  const [color, setColor] = useState<string>(
    () =>
      defaultImportColors(details)[0] ||
      p.colors.find((c) => c.available !== false)?.code ||
      ''
  );
  const [markings, setMarkings] = useState<MpMarking[]>(() =>
    defaultMarkings(p)
  );
  const [format, setFormat] = useState<string>(
    () => p.dimensions?.standardFormats[0]?.code || ''
  );
  const [tiers, setTiers] = useState<MpPriceGridTier[] | null>(null);
  const [gridError, setGridError] = useState<string | null>(null);
  const [markup, setMarkup] = useState<number>(readMarkup);
  const mpCategories = useMpCategories();
  const remembered = mpCategories.rememberedFor(p.category);
  const [category, setCategory] = useState(() =>
    pickImportCategory(
      categories,
      remembered,
      suggestCategory(categories, p.category)
    )
  );
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ documentId: string; name: string } | null>(
    null
  );
  const seq = useRef(0);

  useEffect(() => {
    if (!category && categories.length)
      setCategory(
        pickImportCategory(
          categories,
          remembered,
          suggestCategory(categories, p.category)
        )
      );
  }, [categories, category, p.category, remembered]);

  // Grille de prix relue à chaque changement de coloris, marquage ou format.
  const markingsOk = markings.every(
    (m) => m.position && (m.format || Number(m.width_mm) > 0)
  );
  useEffect(() => {
    if (!markingsOk) return;
    const id = ++seq.current;
    const t = setTimeout(async () => {
      setGridError(null);
      try {
        const { data } = await apiGetMasterPrintPriceGrid(p.id, {
          color: color || undefined,
          markings,
          format: format || undefined,
        });
        if (id === seq.current) setTiers(data.tiers);
      } catch (e) {
        if (id === seq.current) {
          setTiers(null);
          setGridError(
            masterPrintError(e, 'Prix indisponible pour cette configuration.')
          );
        }
      }
    }, 350);
    return () => clearTimeout(t);
  }, [p.id, color, markings, format, markingsOk]);

  const rows = useMemo(
    () => (tiers ? tierRows(tiers, markup) : []),
    [tiers, markup]
  );
  const issues = [
    ...(p.colors.length && !colors.length
      ? ['Choisissez au moins un coloris à importer']
      : []),
    ...(!markingsOk ? ['Complétez les marquages (emplacement et taille)'] : []),
    ...(!rows.length && !gridError ? ['Prix en cours de calcul…'] : []),
  ];

  const toggle = (code: string) =>
    setColors((cs) =>
      cs.includes(code) ? cs.filter((c) => c !== code) : [...cs, code]
    );

  const doImport = async () => {
    const again = details.imported.length > 0 || !!done;
    if (
      again &&
      !window.confirm('Ce produit est déjà dans PEG. Créer une seconde fiche ?')
    )
      return;
    setBusy(true);
    try {
      const { data } = await apiImportMasterPrintProduct(p.id, {
        markupPercent: markup,
        categoryDocumentId: category || undefined,
        colors,
        color: color || colors[0],
        markings,
        format: format || undefined,
        ...(again ? { again: true } : {}),
      });
      setDone({ documentId: data.productDocumentId, name: data.name });
      if (category) mpCategories.remember(p.category, category);
      const extra = [
        data.created.colors ? `${data.created.colors} coloris créé(s)` : '',
        data.created.sizes ? `${data.created.sizes} taille(s) créée(s)` : '',
      ]
        .filter(Boolean)
        .join(', ');
      toast.success(
        `« ${data.name} » importé dans PEG${extra ? ` (${extra})` : ''}`
      );
      onImported();
    } catch (e) {
      toast.error(masterPrintError(e, 'Import impossible.'));
    } finally {
      setBusy(false);
    }
  };

  const shownSizes =
    color && p.sizes.length ? sizesForColor(p, color) : p.sizes;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
          {p.name}
        </h2>
        <p style={{ ...muted, marginTop: '4px' }}>
          {[
            p.brand,
            p.sku ? `réf. ${p.sku}` : null,
            mpCategories.labelOf(p.category),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {[...details.imported, ...(done ? [done] : [])].map((imp) => (
          <p
            key={imp.documentId}
            style={{
              fontSize: '12.5px',
              marginTop: '6px',
              color: '#86efac',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <HiCheckCircle aria-hidden="true" /> Dans PEG :{' '}
            <Link
              to={`/admin/products/edit/${imp.documentId}`}
              style={{ color: '#86efac', textDecoration: 'underline' }}
            >
              {imp.name}
            </Link>
            <span aria-hidden="true">·</span>
            <Link
              to={`/admin/master-print/offers/${imp.documentId}`}
              style={{ color: '#b9b0ff', textDecoration: 'underline' }}
            >
              formulaire client
            </Link>
          </p>
        ))}
        {done && p.category === 'textile' && (
          <ImportPhotosButton productDocumentId={done.documentId} />
        )}
      </div>

      {p.description && (
        <p style={{ ...muted, whiteSpace: 'pre-line' }}>{p.description}</p>
      )}

      {!!p.colors.length && (
        <section>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3 style={{ ...sectionTitle, margin: 0 }}>
              Coloris ({p.colors.length})
            </h3>
            <span style={{ display: 'inline-flex', gap: '6px' }}>
              <Btn
                onClick={() =>
                  setColors(
                    p.colors
                      .filter((c) => c.available !== false)
                      .map((c) => c.code)
                  )
                }
              >
                Tout
              </Btn>
              <Btn onClick={() => setColors([])}>Aucun</Btn>
            </span>
          </div>
          <p style={{ ...muted, margin: '4px 0 8px' }}>
            Cochez les coloris à importer. Un coloris absent de PEG y est créé.
          </p>
          <div style={grid(150)}>
            {p.colors.map((c) => {
              const peg = details.pegColors[c.code];
              const on = colors.includes(c.code);
              return (
                <label
                  key={c.code}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    cursor: c.available === false ? 'not-allowed' : 'pointer',
                    background: on
                      ? 'rgba(59,130,246,0.12)'
                      : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${on ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.06)'}`,
                    opacity: c.available === false ? 0.45 : 1,
                    fontSize: '12.5px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={c.available === false}
                    onChange={() => toggle(c.code)}
                  />
                  <span
                    aria-hidden="true"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: c.hex || 'rgba(255,255,255,0.2)',
                      border: '1px solid rgba(255,255,255,0.3)',
                    }}
                  />
                  <span style={{ minWidth: 0 }}>
                    {c.label}
                    <span
                      style={{
                        display: 'block',
                        color: 'rgba(255,255,255,0.45)',
                        fontSize: '11px',
                      }}
                    >
                      {peg
                        ? `PEG : ${peg.name}`
                        : `nouveau : ${details.newColorNames[c.code] || c.label}`}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      )}

      {!!p.sizes.length && (
        <section>
          <h3 style={sectionTitle}>
            Tailles
            {color
              ? ` (coloris ${p.colors.find((c) => c.code === color)?.label || color})`
              : ''}
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {p.sizes.map((s) => (
              <Pill
                key={s}
                tone={
                  shownSizes.includes(s)
                    ? MUTED_TONE
                    : { ...MUTED_TONE, color: 'rgba(255,255,255,0.3)' }
                }
              >
                {s}
                {details.pegSizes[s] && details.pegSizes[s]!.name !== s
                  ? ` = ${details.pegSizes[s]!.name}`
                  : ''}
              </Pill>
            ))}
          </div>
        </section>
      )}

      {!!p.colors.length && <CatalogStock productId={p.id} color={color} />}

      <section>
        <h3 style={sectionTitle}>Prix d’achat par quantité</h3>
        <div style={{ ...grid(200), marginBottom: '10px' }}>
          {!!p.colors.length && (
            <Field title="Coloris chiffré">
              <select
                style={input}
                value={color}
                onChange={(e) => setColor(e.target.value)}
              >
                {p.colors.map((c) => (
                  <option
                    key={c.code}
                    value={c.code}
                    disabled={c.available === false}
                  >
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {!!p.dimensions?.standardFormats.length && (
            <Field title="Format">
              <select
                style={input}
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                {p.dimensions.standardFormats.map((f) => (
                  <option key={f.code} value={f.code}>
                    {f.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
        {p.markings && (
          <div style={{ marginBottom: '10px' }}>
            <p style={label}>Marquages compris dans le prix</p>
            <MarkingsEditor
              view={p}
              markings={markings}
              onChange={setMarkings}
            />
          </div>
        )}
        {gridError && <p style={{ ...muted, color: '#fca5a5' }}>{gridError}</p>}
        {!!rows.length && (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '12.5px',
              }}
            >
              <thead>
                <tr
                  style={{ textAlign: 'left', color: 'rgba(255,255,255,0.5)' }}
                >
                  <th style={{ padding: '6px 8px', fontWeight: 600 }}>
                    Quantité
                  </th>
                  <th style={{ padding: '6px 8px', fontWeight: 600 }}>
                    Achat HT / pièce
                  </th>
                  <th style={{ padding: '6px 8px', fontWeight: 600 }}>
                    Vente PEG (+{markup} %)
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.from}
                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <td style={{ padding: '6px 8px' }}>
                      {r.to ? `${r.from} à ${r.to}` : `${r.from} et plus`}
                    </td>
                    <td style={{ padding: '6px 8px' }}>{fmtEur(r.cost)}</td>
                    <td style={{ padding: '6px 8px', fontWeight: 700 }}>
                      {fmtEur(r.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 style={sectionTitle}>Importer dans PEG</h3>
        <div style={grid(200)}>
          <Field title="Majoration (%)">
            <input
              style={input}
              type="number"
              min={0}
              max={500}
              value={Number.isFinite(markup) ? markup : 0}
              onChange={(e) => {
                const n = Math.min(
                  500,
                  Math.max(0, Number(e.target.value) || 0)
                );
                setMarkup(n);
                try {
                  localStorage.setItem(MARKUP_KEY, String(n));
                } catch {
                  /* stockage indisponible : la valeur vaut pour cette page */
                }
              }}
            />
          </Field>
          <Field title="Catégorie PEG">
            <select
              style={input}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Aucune (à ranger plus tard)</option>
              {categories.map((c) => (
                <option key={c.documentId} value={c.documentId}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p style={{ ...muted, marginTop: '8px' }}>
          Le produit est créé{' '}
          <strong style={{ color: '#fff' }}>invisible des clients</strong>, avec
          ces paliers de prix, le prix d’achat comme prix de revient, et la
          correspondance Master Print déjà faite. Il reçoit aussi son{' '}
          <strong style={{ color: '#fff' }}>formulaire client</strong> : le
          client compose sa commande (coloris, tailles, marquages, options),
          voit le prix en direct, et la commande payée part seule chez Master
          Print. Ajoutez la photo sur sa fiche, réglez le formulaire, puis
          mettez-le au catalogue ou dans les offres d’un client.
        </p>
        <Issues items={issues} />
        <div
          style={{
            marginTop: '10px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <Btn
            variant="primary"
            onClick={doImport}
            disabled={busy || issues.length > 0}
          >
            {busy
              ? 'Import…'
              : details.imported.length || done
                ? 'Importer une autre fois'
                : 'Importer dans PEG'}
          </Btn>
          {done && (
            <Link to={`/admin/products/edit/${done.documentId}`}>
              <Btn>Ouvrir la fiche produit</Btn>
            </Link>
          )}
          {done && (
            <Link to={`/admin/master-print/offers/${done.documentId}`}>
              <Btn>Régler le formulaire client</Btn>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

type Props = {
  /**
   * Affichée dans l'onglet « Catalogue » de la page Master Print : sans titre ni
   * bandeau d'état (la page les porte), prix et photos ayant leurs propres onglets.
   */
  embedded?: boolean;
};

const MasterPrintCatalog = ({ embedded = false }: Props) => {
  const { smaller } = useResponsive();
  const phone = smaller.md;
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<MpCatalogResult[]>([]);
  const [meta, setMeta] = useState<{
    matched: number;
    total: number;
    counts: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<'ok' | 'missing' | 'error'>('ok');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [details, setDetails] = useState<MpCatalogDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [categories, setCategories] = useState<
    Array<{ documentId: string; name: string }>
  >([]);
  const mpCategories = useMpCategories();
  const seq = useRef(0);
  // Cartes : photo et prix des fiches PEG déjà importées (lus par lots, gardés).
  const [pegInfo, setPegInfo] = useState<Record<string, PegCardInfo>>({});
  const pegAsked = useRef<Set<string>>(new Set());
  const gridScroll = useRef(0);

  const search = useCallback(
    async (offset: number) => {
      const id = ++seq.current;
      setLoading(true);
      try {
        const { data } = await apiSearchMasterPrintCatalog(
          q.trim(),
          category || undefined,
          offset,
          PAGE
        );
        if (id !== seq.current) return;
        setResults((r) => (offset ? [...r, ...data.results] : data.results));
        setMeta({
          matched: data.matched,
          total: data.total,
          counts: data.counts || {},
        });
        setState('ok');
      } catch (e) {
        if (id !== seq.current) return;
        if (isMasterPrintMissing(e)) setState('missing');
        else {
          setError(masterPrintError(e, 'Catalogue Master Print indisponible.'));
          setState('error');
        }
      } finally {
        if (id === seq.current) setLoading(false);
      }
    },
    [q, category]
  );

  useEffect(() => {
    const t = setTimeout(() => search(0), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    for (const ids of idsToFetch(results, pegAsked.current)) {
      ids.forEach((id) => pegAsked.current.add(id));
      apiGetPegCardProducts(ids)
        .then(({ data }) => {
          const found = data?.data?.products || [];
          setPegInfo((cur) => {
            const next = { ...cur };
            for (const p of found) next[p.documentId] = pegCardInfo(p);
            return next;
          });
        })
        .catch(() => {
          // Carte sans photo ni prix : l'illustration de la famille reste.
          ids.forEach((id) => pegAsked.current.delete(id));
        });
    }
  }, [results]);

  useEffect(() => {
    apiGetPegCategoriesForMasterPrint()
      .then(({ data }) => setCategories(data.categories || []))
      .catch(() => setCategories([]));
  }, []);

  const open = useCallback(async (id: string) => {
    gridScroll.current = window.scrollY;
    setSelected(id);
    setDetails(null);
    setDetailsLoading(true);
    try {
      const { data } = await apiGetMasterPrintCatalogDetails(id);
      setDetails(data);
    } catch (e) {
      toast.error(masterPrintError(e, 'Fiche produit indisponible.'));
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const refreshImported = useCallback(async () => {
    if (!selected) return;
    try {
      const { data } = await apiGetMasterPrintCatalogDetails(selected);
      setResults((rs) =>
        rs.map((r) =>
          r.id === selected ? { ...r, imported: data.imported } : r
        )
      );
    } catch {
      /* la fiche reste affichée telle quelle */
    }
  }, [selected]);

  const wrap = (children: React.ReactNode) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        fontFamily: 'Inter, sans-serif',
        color: '#fff',
        padding: embedded ? 0 : phone ? '12px 0' : '4px 0 24px',
      }}
    >
      {!embedded && <ServiceStatusBanner />}
      {children}
    </div>
  );

  if (state === 'missing')
    return wrap(
      <div style={card}>
        <p style={muted}>
          Module Master Print indisponible : le serveur n’est pas encore à jour.
        </p>
      </div>
    );
  if (state === 'error') {
    return wrap(
      <div style={card}>
        <p style={{ ...muted, color: '#fca5a5' }}>{error}</p>
        <div style={{ marginTop: '10px' }}>
          <Btn onClick={() => search(0)}>Réessayer</Btn>
        </div>
      </div>
    );
  }

  const backToGrid = () => {
    setSelected(null);
    setDetails(null);
    requestAnimationFrame(() => window.scrollTo({ top: gridScroll.current }));
  };

  const list = (
    <div style={{ minWidth: 0 }}>
      <div className="hx-ptoolbar" style={{ ...card, padding: '14px' }}>
        <div style={{ position: 'relative' }}>
          <HiSearch
            style={{ position: 'absolute', left: 12, top: 13, opacity: 0.5 }}
            aria-hidden="true"
          />
          <input
            style={{ ...input, paddingLeft: '34px' }}
            placeholder="Nom, marque ou référence (TU01T, polo, roll-up…)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Rechercher dans le catalogue Master Print"
          />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {[['', 'Tout'], ...Object.entries(mpCategories.labels)].map(
            ([code, name]) => (
              <button
                key={code || 'tout'}
                type="button"
                className="peg-tap-target"
                onClick={() => setCategory(code)}
                aria-pressed={category === code}
                style={{
                  margin: 0,
                  padding: '6px 13px',
                  borderRadius: '100px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  border:
                    category === code
                      ? 'none'
                      : '1px solid rgba(255,255,255,0.1)',
                  background:
                    category === code
                      ? 'linear-gradient(135deg, #8b7dff 0%, #5b47e0 100%)'
                      : 'rgba(255,255,255,0.05)',
                  color: category === code ? '#fff' : 'rgba(255,255,255,0.7)',
                }}
              >
                {name}
                {code && meta?.counts[code] ? ` (${meta.counts[code]})` : ''}
              </button>
            )
          )}
        </div>
        <p style={muted}>
          {meta
            ? `${meta.matched.toLocaleString('fr-FR')} produit(s)${q.trim() || category ? ` sur ${meta.total.toLocaleString('fr-FR')}` : ''} — meilleures ventes d’abord`
            : 'Chargement du catalogue…'}
        </p>
      </div>

      <div className="hx-pgrid">
        {results.map((r) => {
          const pegId = cardPegId(r);
          return (
            <CatalogProductCard
              key={r.id}
              item={r}
              categoryLabel={mpCategories.labelOf(r.category)}
              peg={pegId ? (pegInfo[pegId] ?? null) : null}
              onOpen={open}
            />
          );
        })}
      </div>
      {!loading && meta && !results.length && (
        <p style={{ ...muted, marginTop: '12px' }}>
          Aucun produit ne correspond.
        </p>
      )}
      {meta && results.length < meta.matched && (
        <div
          style={{
            marginTop: '16px',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Btn onClick={() => search(results.length)} disabled={loading}>
            {loading
              ? 'Chargement…'
              : `Afficher plus de produits (${(meta.matched - results.length).toLocaleString('fr-FR')} restants)`}
          </Btn>
        </div>
      )}
    </div>
  );

  const sheet = (
    <div style={{ ...card, minWidth: 0 }}>
      <div style={{ marginBottom: '14px' }}>
        <Btn onClick={backToGrid}>
          <HiArrowLeft aria-hidden="true" /> Retour au catalogue
        </Btn>
      </div>
      {detailsLoading && <p style={muted}>Chargement de la fiche…</p>}
      {!detailsLoading && !details && (
        <p style={muted}>Choisissez un produit dans la liste.</p>
      )}
      {details && (
        <ProductSheet
          key={details.product.id}
          details={details}
          categories={categories}
          onImported={refreshImported}
        />
      )}
    </div>
  );

  return wrap(
    <>
      {!embedded && (
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>
            Catalogue Master Print
          </h1>
          <p style={{ ...muted, marginTop: '4px' }}>
            Prix d’achat du compte PEG chez Master Print. Un produit importé
            reste invisible des clients jusqu’à sa mise au catalogue. Master
            Print ne fournit pas de photos : le panneau « Photos des produits »
            retrouve celles du fabricant.
          </p>
        </div>
      )}
      {/* Prix d'achat des produits importés (au téléphone : masqué pendant la lecture d'une fiche). */}
      {!embedded && !(phone && selected) && <PurchasePricesPanel />}
      {!embedded && !(phone && selected) && <ProductPhotosPanel />}
      {selected ? sheet : list}
    </>
  );
};

export default MasterPrintCatalog;
