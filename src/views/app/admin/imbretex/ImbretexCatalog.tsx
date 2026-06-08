import { injectReducer } from '@/store';
import reducer, {
  fetchAllImbretexProducts,
  fetchImbretexPriceStockByRef,
  fetchImbretexPriceStockBatch,
  useAppDispatch,
  useAppSelector,
} from './store';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Pagination, Select } from '@/components/ui';
import { Container, EmptyState } from '@/components/shared';
import { HiOutlineSearch, HiOutlineCheck, HiOutlineX, HiStar, HiOutlineStar } from 'react-icons/hi';
import { toast } from 'react-toastify';
import { importImbretexProduct, resetImportCaches } from '@/services/ImbretexImportService';
import type { ImbretexProduct, ImbretexVariant, ImbretexPriceStock } from '@/@types/imbretex';

injectReducer('imbretex', reducer);

// ─── Helpers ───

function fixImageUrl(url: string): string {
  return url.replace('admin.preprod.imbretex-upgrade.hegyd.net', 'www.imbretex.fr');
}

function getBestImage(product: ImbretexProduct): string | null {
  if (Array.isArray(product.images)) {
    if (product.images.length > 0) return fixImageUrl(product.images[0].url);
  } else if (product.images?.url) {
    return fixImageUrl(product.images.url);
  }
  for (const v of product.variants) {
    if (v.images?.length > 0) return fixImageUrl(v.images[0].url);
  }
  return null;
}

function getProductTitle(variant: ImbretexVariant): string {
  return variant.title?.fr || variant.title?.en || '';
}

function getSize(variant: ImbretexVariant): string {
  return variant.attributes?.find((a) => a.type === 'sizes')?.value || '';
}

function getColor(variant: ImbretexVariant): string {
  return variant.attributes?.find((a) => a.type === 'color')?.value || '';
}

function getColorHex(variant: ImbretexVariant): string {
  return variant.attributes?.find((a) => a.type === 'color')?.hex || '';
}

function getFamily(variant: ImbretexVariant): string {
  return variant.categories?.[0]?.families?.fr || '';
}

function getCategory(variant: ImbretexVariant): string {
  return variant.categories?.[0]?.categories?.fr || '';
}

function getProductCategory(product: ImbretexProduct): string {
  for (const v of product.variants) {
    const cat = getCategory(v);
    if (cat) return cat;
  }
  return '';
}

// Synthèse prix + disponibilité d'un produit à partir du cache prix/stock
// (indexé par référence de variante). Sert à l'affichage sur les cartes.
type CardPriceStock = {
  hasData: boolean;
  minPrice: number | null;
  maxPrice: number | null;
  totalStock: number;
  supplierStock: number;
};

function getCardPriceStock(
  product: ImbretexProduct,
  map: Record<string, ImbretexPriceStock>
): CardPriceStock {
  let min = Infinity;
  let max = 0;
  let totalStock = 0;
  let supplierStock = 0;
  let count = 0;
  for (const v of product.variants) {
    const ps = map[v.variantReference];
    if (!ps) continue;
    count++;
    const price = parseFloat(ps.price);
    if (Number.isFinite(price) && price > 0) {
      min = Math.min(min, price);
      max = Math.max(max, price);
    }
    totalStock += parseInt(ps.stock) || 0;
    supplierStock += parseInt(ps.stock_supplier) || 0;
  }
  return {
    hasData: count > 0,
    minPrice: Number.isFinite(min) ? min : null,
    maxPrice: max || null,
    totalStock,
    supplierStock,
  };
}

// ─── Product Detail Modal ───

type ProductDetailProps = {
  product: ImbretexProduct;
  priceStockMap: Record<string, ImbretexPriceStock>;
  loadingPrices: boolean;
  onClose: () => void;
};

const ProductDetail = ({ product, priceStockMap, loadingPrices, onClose }: ProductDetailProps) => {
  const mainVariant = product.variants[0];
  const image = getBestImage(product);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }} onClick={onClose}>
      <div style={{
        background: 'linear-gradient(160deg, #1a2f4a 0%, #111e30 100%)',
        border: '1.5px solid rgba(47,111,237,0.2)',
        borderRadius: '20px',
        padding: '32px',
        maxWidth: '860px', width: '100%', maxHeight: '85vh',
        overflow: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        fontFamily: 'Inter, sans-serif',
      }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
          {image && (
            <img src={image} alt={product.reference}
              style={{
                width: '140px', height: '140px', objectFit: 'contain',
                borderRadius: '12px', background: '#fff', padding: '8px',
                flexShrink: 0,
              }}
            />
          )}
          <div style={{ flex: 1 }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>
              {product.brands?.name}
            </p>
            <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
              {product.reference}
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', margin: '0 0 8px' }}>
              {mainVariant ? getProductTitle(mainVariant) : ''}
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {mainVariant && getFamily(mainVariant) && (
                <span style={{
                  background: 'rgba(47,111,237,0.15)', border: '1px solid rgba(47,111,237,0.3)',
                  borderRadius: '6px', padding: '3px 10px',
                  color: '#60a5fa', fontSize: '11px', fontWeight: 600,
                }}>
                  {getFamily(mainVariant)}
                </span>
              )}
              <span style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px', padding: '3px 10px',
                color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600,
              }}>
                {product.variants.length} variante{product.variants.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '8px', width: '36px', height: '36px',
            color: 'rgba(255,255,255,0.5)', fontSize: '18px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            ✕
          </button>
        </div>

        {/* Description */}
        {mainVariant?.description?.fr && (
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', lineHeight: 1.6, margin: '0 0 20px' }}>
            {mainVariant.description.fr}
          </p>
        )}

        {/* Variantes — tableau */}
        <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 700, margin: '0 0 12px' }}>
          Prix et stocks {loadingPrices && <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>— chargement...</span>}
        </h4>

        <div style={{ overflowX: 'auto', maxHeight: '420px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ textAlign: 'left', padding: '8px 10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '11px' }}>Référence</th>
                <th style={{ textAlign: 'left', padding: '8px 10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '11px' }}>Couleur</th>
                <th style={{ textAlign: 'left', padding: '8px 10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '11px' }}>Taille</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '11px' }}>Prix unit.</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '11px' }}>Prix carton</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '11px' }}>Stock</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '11px' }}>Stock fourn.</th>
              </tr>
            </thead>
            <tbody>
              {product.variants.map((v) => {
                const ps = priceStockMap[v.variantReference];
                const colorHex = getColorHex(v);
                const stock = ps ? parseInt(ps.stock) : 0;
                const stockSupplier = ps ? parseInt(ps.stock_supplier) : 0;
                return (
                  <tr key={v.variantReference} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '8px 10px', color: '#fff', fontWeight: 600 }}>
                      {v.variantReference}
                    </td>
                    <td style={{ padding: '8px 10px', color: 'rgba(255,255,255,0.6)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {colorHex && (
                          <span style={{
                            display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%',
                            background: colorHex, border: '1px solid rgba(255,255,255,0.2)',
                          }} />
                        )}
                        {getColor(v)}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', color: 'rgba(255,255,255,0.6)' }}>
                      {getSize(v)}
                    </td>
                    {ps ? (
                      <>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#fff', fontWeight: 600 }}>
                          {ps.price}€
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: 'rgba(255,255,255,0.5)' }}>
                          {ps.price_box}€ <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>x{ps.quantity_box}</span>
                        </td>
                        <td style={{
                          padding: '8px 10px', textAlign: 'right', fontWeight: 600,
                          color: stock > 0 ? '#4ade80' : '#f87171',
                        }}>
                          {ps.stock}
                        </td>
                        <td style={{
                          padding: '8px 10px', textAlign: 'right',
                          color: stockSupplier > 0 ? 'rgba(74,222,128,0.6)' : 'rgba(255,255,255,0.2)',
                        }}>
                          {ps.stock_supplier}
                        </td>
                      </>
                    ) : (
                      <td colSpan={4} style={{ padding: '8px 10px', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>
                        {loadingPrices ? '...' : '—'}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Documents */}
        {product.links?.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 700, margin: '0 0 8px' }}>
              Documents
            </h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {product.links.map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px', padding: '6px 12px',
                    color: '#60a5fa', fontSize: '12px', fontWeight: 600,
                    textDecoration: 'none',
                  }}>
                  {link.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Product Card ───

type CardProps = {
  product: ImbretexProduct;
  onView: (p: ImbretexProduct) => void;
  selected: boolean;
  onToggleSelect: (ref: string) => void;
  isFavorite: boolean;
  onToggleFavorite: (ref: string) => void;
  priceStock: CardPriceStock;
};

const ImbretexProductCard = ({ product, onView, selected, onToggleSelect, isFavorite, onToggleFavorite, priceStock }: CardProps) => {
  const image = getBestImage(product);
  const mainVariant = product.variants[0];
  const title = mainVariant ? getProductTitle(mainVariant) : product.reference;
  const family = mainVariant ? getFamily(mainVariant) : '';
  const variantCount = product.variants.length;

  // Disponibilité : en stock PEG > 0, sinon stock fournisseur > 0 (sur commande), sinon rupture
  const stockBadge = !priceStock.hasData
    ? { label: 'Dispo. …', color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', dot: 'rgba(255,255,255,0.3)' }
    : priceStock.totalStock > 0
    ? { label: `En stock (${priceStock.totalStock})`, color: '#4ade80', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', dot: '#22c55e' }
    : priceStock.supplierStock > 0
    ? { label: 'Sur commande', color: '#fbbf24', bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.3)', dot: '#f59e0b' }
    : { label: 'Rupture', color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', dot: '#ef4444' };
  const priceLabel = priceStock.minPrice == null
    ? null
    : priceStock.maxPrice != null && priceStock.maxPrice > priceStock.minPrice
    ? `dès ${priceStock.minPrice.toFixed(2)} €`
    : `${priceStock.minPrice.toFixed(2)} €`;

  return (
    <div
      style={{
        background: selected ? 'rgba(47,111,237,0.08)' : 'rgba(255,255,255,0.03)',
        border: selected ? '1.5px solid rgba(47,111,237,0.4)' : '1px solid rgba(255,255,255,0.06)',
        borderRadius: '14px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontFamily: 'Inter, sans-serif',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.borderColor = 'rgba(47,111,237,0.3)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Checkbox */}
      <div
        onClick={(e) => { e.stopPropagation(); onToggleSelect(product.reference); }}
        style={{
          position: 'absolute', top: '8px', left: '8px', zIndex: 2,
          width: '24px', height: '24px', borderRadius: '6px',
          background: selected ? '#2f6fed' : 'rgba(0,0,0,0.5)',
          border: selected ? '2px solid #2f6fed' : '2px solid rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.15s ease',
        }}
      >
        {selected && <HiOutlineCheck size={14} style={{ color: '#fff', strokeWidth: 3 }} />}
      </div>

      {/* Favorite */}
      <div
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(product.reference); }}
        style={{
          position: 'absolute', top: '8px', right: '8px', zIndex: 2,
          width: '28px', height: '28px', borderRadius: '50%',
          background: isFavorite ? 'rgba(250,204,21,0.2)' : 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.15s ease',
        }}
      >
        {isFavorite
          ? <HiStar size={16} style={{ color: '#facc15' }} />
          : <HiOutlineStar size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
        }
      </div>

      <div onClick={() => onView(product)}>
        <div style={{
          width: '100%', height: '160px',
          background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', padding: '8px',
        }}>
          {image ? (
            <img src={image} alt={product.reference}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          ) : (
            <div style={{ color: '#999', fontSize: '12px' }}>Pas d'image</div>
          )}
        </div>
        <div style={{ padding: '12px 14px' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 2px' }}>
            {product.brands?.name}
          </p>
          <h4 style={{ color: '#fff', fontSize: '13px', fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
            {product.reference}
          </h4>
          <p style={{
            color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: '0 0 8px',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {title}
          </p>

          {/* Prix + disponibilité */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: '15px', letterSpacing: '-0.02em' }}>
              {priceLabel ?? <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600, fontSize: '12px' }}>Prix …</span>}
              {priceLabel && <span style={{ fontSize: '10px', fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}> HT</span>}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: stockBadge.bg, border: `1px solid ${stockBadge.border}`,
              borderRadius: '100px', padding: '2px 8px',
              color: stockBadge.color, fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: stockBadge.dot, flexShrink: 0 }} />
              {stockBadge.label}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {family && (
              <span style={{
                background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.25)',
                borderRadius: '5px', padding: '2px 8px',
                color: '#60a5fa', fontSize: '10px', fontWeight: 600,
              }}>
                {family}
              </span>
            )}
            <span style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '5px', padding: '2px 8px',
              color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 600,
            }}>
              {variantCount} variante{variantCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Catalog View ───

const PAGE_SIZE = 60;

const ImbretexCatalog = () => {
  const dispatch = useAppDispatch();
  const { allProducts, loading, loadingProgress, loadingPrices, priceStockMap, totalProducts, error } =
    useAppSelector((state) => state.imbretex.data);

  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ImbretexProduct | null>(null);
  const [page, setPage] = useState(1);
  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  // Favoris persistés dans localStorage
  const FAVORITES_KEY = 'imbretex_favorites';
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const handleToggleFavorite = useCallback((ref: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  // Load all products once on mount
  useEffect(() => {
    if (allProducts.length === 0 && !loading) {
      dispatch(fetchAllImbretexProducts());
    }
  }, [dispatch, allProducts.length, loading]);

  // Extract unique brands (from ALL products)
  const brands = useMemo(() => {
    const set = new Set<string>();
    allProducts.forEach((p) => {
      if (p.brands?.name) set.add(p.brands.name);
    });
    return Array.from(set).sort();
  }, [allProducts]);

  // Extract unique categories with counts
  const categoriesWithCount = useMemo(() => {
    const map = new Map<string, number>();
    allProducts.forEach((p) => {
      const cat = getProductCategory(p);
      if (cat) map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, count]) => ({ name, count }));
  }, [allProducts]);

  // Full client-side filter
  const filtered = useMemo(() => {
    let result = allProducts;
    if (showFavoritesOnly) {
      result = result.filter((p) => favorites.has(p.reference));
    }
    if (categoryFilter) {
      result = result.filter((p) => getProductCategory(p) === categoryFilter);
    }
    if (brandFilter) {
      result = result.filter((p) => p.brands?.name === brandFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((p) => {
        const ref = p.reference?.toLowerCase() || '';
        const brand = p.brands?.name?.toLowerCase() || '';
        const title = p.variants[0] ? getProductTitle(p.variants[0]).toLowerCase() : '';
        const family = p.variants[0] ? getFamily(p.variants[0]).toLowerCase() : '';
        return ref.includes(term) || brand.includes(term) || title.includes(term) || family.includes(term);
      });
    }
    return result;
  }, [allProducts, searchTerm, brandFilter, categoryFilter, showFavoritesOnly, favorites]);

  // Client-side pagination
  const totalFiltered = filtered.length;
  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE);
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [searchTerm, brandFilter, categoryFilter, showFavoritesOnly]);

  // Charge prix + disponibilité pour les produits de la page courante (batch),
  // une seule fois par référence (le Set évite tout refetch en boucle).
  const pricedRefs = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (loading) return;
    const toFetch = paginatedProducts
      .map((p) => p.reference)
      .filter((ref) => !pricedRefs.current.has(ref));
    if (toFetch.length === 0) return;
    toFetch.forEach((ref) => pricedRefs.current.add(ref));
    dispatch(fetchImbretexPriceStockBatch(toFetch));
  }, [paginatedProducts, loading, dispatch]);

  // Selection
  const handleToggleSelect = useCallback((ref: string) => {
    setSelectedRefs((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });
  }, []);

  const handleSelectAllPage = useCallback(() => {
    setSelectedRefs((prev) => {
      const next = new Set(prev);
      const allSelected = paginatedProducts.every((p) => next.has(p.reference));
      if (allSelected) {
        paginatedProducts.forEach((p) => next.delete(p.reference));
      } else {
        paginatedProducts.forEach((p) => next.add(p.reference));
      }
      return next;
    });
  }, [paginatedProducts]);

  // Import selected products into PEG (full: category, sizes, colors, price, image)
  const [importProgress, setImportProgress] = useState('');
  // Majoration % appliquée au prix fournisseur pour fixer le prix de vente à l'import.
  // Mémorisée pour le prochain import. Le prix fournisseur brut est conservé comme prix de revient.
  const [markupPercent, setMarkupPercent] = useState<number>(() => {
    const saved = parseFloat(localStorage.getItem('imbretex_markup') || '');
    return Number.isFinite(saved) ? saved : 0;
  });

  const handleImport = useCallback(async () => {
    const toImport = allProducts.filter((p) => selectedRefs.has(p.reference));
    if (toImport.length === 0) return;

    setImporting(true);
    resetImportCaches();
    let created = 0;
    let errors = 0;

    for (let i = 0; i < toImport.length; i++) {
      const product = toImport[i];
      setImportProgress(`${i + 1}/${toImport.length} — ${product.reference}`);

      const result = await importImbretexProduct(product, markupPercent);
      if (result.success) {
        created++;
      } else {
        console.error(`Import ${result.reference} failed:`, result.error);
        errors++;
      }
    }

    setImporting(false);
    setImportProgress('');
    setSelectedRefs(new Set());

    if (created > 0) {
      const markupLabel = markupPercent > 0 ? `, +${markupPercent}% sur le prix` : '';
      toast.success(`${created} produit${created > 1 ? 's' : ''} importé${created > 1 ? 's' : ''} dans PEG (catégorie, tailles, couleurs, prix de revient${markupLabel}, image)`);
    }
    if (errors > 0) {
      toast.warn(`${errors} erreur${errors > 1 ? 's' : ''} lors de l'import`);
    }
  }, [allProducts, selectedRefs, markupPercent]);

  // View product detail → fetch price/stock
  const handleViewProduct = useCallback((product: ImbretexProduct) => {
    setSelectedProduct(product);
    const hasAny = product.variants.some((v) => priceStockMap[v.variantReference]);
    if (!hasAny) {
      dispatch(fetchImbretexPriceStockByRef(product.reference));
    }
  }, [dispatch, priceStockMap]);

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: '16px', paddingTop: '28px', paddingBottom: '24px', flexWrap: 'wrap',
      }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Fournisseur
          </p>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Catalogue Imbretex{' '}
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', fontWeight: 500 }}>
              ({allProducts.length}{loading ? `/${totalProducts}` : ''} produits)
            </span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '4px' }}>
            Cliquez sur un produit pour voir prix et stocks en temps réel
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '10px', padding: '12px 16px', marginBottom: '16px',
          color: '#f87171', fontSize: '13px',
        }}>
          Erreur : {error}
          <button onClick={() => dispatch(fetchAllImbretexProducts())} style={{
            marginLeft: '12px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: '6px', padding: '4px 12px', color: '#f87171', fontSize: '12px',
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}>
            Réessayer
          </button>
        </div>
      )}

      {/* Loading progress */}
      {loading && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600 }}>
              Chargement du catalogue...
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
              {loadingProgress}%
            </span>
          </div>
          <div style={{
            width: '100%', height: '4px', borderRadius: '2px',
            background: 'rgba(255,255,255,0.06)',
          }}>
            <div style={{
              width: `${loadingProgress}%`, height: '100%', borderRadius: '2px',
              background: 'linear-gradient(90deg, #2f6fed, #60a5fa)',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* Category tabs */}
      {!loading && categoriesWithCount.length > 0 && (
        <div style={{
          display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center',
        }}>
          <button
            onClick={() => { setShowFavoritesOnly(!showFavoritesOnly); if (!showFavoritesOnly) setCategoryFilter(''); }}
            style={{
              padding: '7px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              display: 'flex', alignItems: 'center', gap: '5px',
              border: showFavoritesOnly ? '1.5px solid rgba(250,204,21,0.5)' : '1px solid rgba(255,255,255,0.1)',
              background: showFavoritesOnly ? 'rgba(250,204,21,0.12)' : 'rgba(255,255,255,0.04)',
              color: showFavoritesOnly ? '#facc15' : 'rgba(255,255,255,0.5)',
            }}
          >
            <HiStar size={14} /> Favoris ({favorites.size})
          </button>
          <button
            onClick={() => { setCategoryFilter(''); setShowFavoritesOnly(false); }}
            style={{
              padding: '7px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              border: !categoryFilter && !showFavoritesOnly ? '1.5px solid rgba(47,111,237,0.5)' : '1px solid rgba(255,255,255,0.1)',
              background: !categoryFilter && !showFavoritesOnly ? 'rgba(47,111,237,0.15)' : 'rgba(255,255,255,0.04)',
              color: !categoryFilter && !showFavoritesOnly ? '#60a5fa' : 'rgba(255,255,255,0.5)',
            }}
          >
            Tous ({totalProducts})
          </button>
          {categoriesWithCount.map(({ name, count }) => (
            <button
              key={name}
              onClick={() => setCategoryFilter(categoryFilter === name ? '' : name)}
              style={{
                padding: '7px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                border: categoryFilter === name ? '1.5px solid rgba(47,111,237,0.5)' : '1px solid rgba(255,255,255,0.1)',
                background: categoryFilter === name ? 'rgba(47,111,237,0.15)' : 'rgba(255,255,255,0.04)',
                color: categoryFilter === name ? '#60a5fa' : 'rgba(255,255,255,0.5)',
              }}
            >
              {name} ({count})
            </button>
          ))}
        </div>
      )}

      {/* Search + brand filter */}
      {!loading && (
        <div style={{
          display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center',
        }}>
          <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '400px' }}>
            <HiOutlineSearch size={15} style={{
              position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
              color: 'rgba(255,255,255,0.55)', pointerEvents: 'none',
            }} />
            <input
              type="text"
              placeholder="Rechercher ref, marque, titre, type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: '10px',
                padding: '10px 14px 10px 36px',
                color: '#fff', fontSize: '13px',
                fontFamily: 'Inter, sans-serif', outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; }}
            />
          </div>

          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#fff', fontSize: '13px',
              fontFamily: 'Inter, sans-serif', outline: 'none',
              cursor: 'pointer',
              minWidth: '180px',
            }}
          >
            <option value="" style={{ background: '#1a2f4a' }}>Toutes les marques</option>
            {brands.map((b) => (
              <option key={b} value={b} style={{ background: '#1a2f4a' }}>{b}</option>
            ))}
          </select>

          <button
            onClick={handleSelectAllPage}
            style={{
              padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            {paginatedProducts.every((p) => selectedRefs.has(p.reference)) && paginatedProducts.length > 0
              ? 'Désélectionner la page'
              : 'Sélectionner la page'}
          </button>

          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 500 }}>
            {totalFiltered} résultat{totalFiltered > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Product grid */}
      {paginatedProducts.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '16px',
        }}>
          {paginatedProducts.map((product) => (
            <ImbretexProductCard
              key={product.reference}
              product={product}
              onView={handleViewProduct}
              selected={selectedRefs.has(product.reference)}
              onToggleSelect={handleToggleSelect}
              isFavorite={favorites.has(product.reference)}
              onToggleFavorite={handleToggleFavorite}
              priceStock={getCardPriceStock(product, priceStockMap)}
            />
          ))}
        </div>
      ) : (
        !loading && (
          <EmptyState
            title="Aucun produit trouvé"
            description={searchTerm || brandFilter || categoryFilter
              ? "Modifiez vos filtres pour voir plus de résultats"
              : "Le catalogue Imbretex n'a retourné aucun produit"}
            icon={<HiOutlineSearch size={48} />}
          />
        )
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: '12px', marginTop: '32px', paddingBottom: '32px',
        }}>
          <Pagination
            pageSize={PAGE_SIZE}
            currentPage={page}
            total={totalFiltered}
            onChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* Detail modal */}
      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          priceStockMap={priceStockMap}
          loadingPrices={loadingPrices}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Floating action bar */}
      {selectedRefs.size > 0 && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 900,
          background: 'linear-gradient(160deg, #1a2f4a 0%, #111e30 100%)',
          border: '1.5px solid rgba(47,111,237,0.3)',
          borderRadius: '14px',
          padding: '14px 24px',
          display: 'flex', alignItems: 'center', gap: '16px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          fontFamily: 'Inter, sans-serif',
        }}>
          <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>
            {selectedRefs.size} produit{selectedRefs.size > 1 ? 's' : ''} sélectionné{selectedRefs.size > 1 ? 's' : ''}
          </span>

          {/* Majoration % appliquée au prix fournisseur (prix de vente = fournisseur × (1 + %)) */}
          <div
            title="Le prix fournisseur devient le prix de revient. Le prix de vente = fournisseur + cette majoration."
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '4px 10px' }}
          >
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600 }}>Majoration</span>
            <input
              type="number"
              min={0}
              step={1}
              value={Number.isFinite(markupPercent) ? markupPercent : 0}
              disabled={importing}
              onChange={(e) => {
                const v = e.target.value === '' ? 0 : parseFloat(e.target.value);
                const safe = Number.isFinite(v) && v >= 0 ? v : 0;
                setMarkupPercent(safe);
                localStorage.setItem('imbretex_markup', String(safe));
              }}
              style={{ width: '56px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '7px', padding: '5px 8px', color: '#fff', fontSize: '13px', fontWeight: 700, fontFamily: 'Inter, sans-serif', outline: 'none', textAlign: 'right' }}
            />
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 700 }}>%</span>
          </div>

          <button
            onClick={handleImport}
            disabled={importing}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'linear-gradient(90deg, #16a34a, #15803d)',
              border: 'none', borderRadius: '10px', padding: '10px 20px',
              color: '#fff', fontSize: '13px', fontWeight: 600,
              cursor: importing ? 'wait' : 'pointer',
              opacity: importing ? 0.6 : 1,
              fontFamily: 'Inter, sans-serif',
              boxShadow: '0 4px 14px rgba(22,163,74,0.4)',
            }}
          >
            {importing ? `Import... ${importProgress}` : 'Importer dans PEG'}
          </button>
          <button
            onClick={() => setSelectedRefs(new Set())}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px', width: '36px', height: '36px',
              color: 'rgba(255,255,255,0.5)', fontSize: '16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <HiOutlineX size={16} />
          </button>
        </div>
      )}
    </Container>
  );
};

export default ImbretexCatalog;
