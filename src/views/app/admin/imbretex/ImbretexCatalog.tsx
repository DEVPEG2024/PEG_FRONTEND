import { injectReducer } from '@/store';
import reducer, {
  fetchImbretexProducts,
  fetchImbretexPriceStockByRef,
  useAppDispatch,
  useAppSelector,
} from './store';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Pagination } from '@/components/ui';
import { Container, Loading, EmptyState } from '@/components/shared';
import { HiOutlineSearch } from 'react-icons/hi';
import type { ImbretexProduct, ImbretexVariant, ImbretexPriceStock } from '@/@types/imbretex';

injectReducer('imbretex', reducer);

// ─── Helpers ───

/** Les images préprod pointent vers admin.preprod mais sont en 404. Le vrai CDN est www.imbretex.fr */
function fixImageUrl(url: string): string {
  return url.replace('admin.preprod.imbretex-upgrade.hegyd.net', 'www.imbretex.fr');
}

/** Cherche la meilleure image : d'abord product.images, sinon première variante */
function getBestImage(product: ImbretexProduct): string | null {
  // Image produit (peut être objet ou tableau)
  if (Array.isArray(product.images)) {
    if (product.images.length > 0) return fixImageUrl(product.images[0].url);
  } else if (product.images?.url) {
    return fixImageUrl(product.images.url);
  }
  // Fallback : image de la première variante
  for (const v of product.variants) {
    if (v.images?.length > 0) return fixImageUrl(v.images[0].url);
  }
  return null;
}

function getProductTitle(variant: ImbretexVariant): string {
  return variant.title?.fr || variant.title?.en || '';
}

function getSize(variant: ImbretexVariant): string {
  const attr = variant.attributes?.find((a) => a.type === 'sizes');
  return attr?.value || '';
}

function getColor(variant: ImbretexVariant): string {
  const attr = variant.attributes?.find((a) => a.type === 'color');
  return attr?.value || '';
}

function getColorHex(variant: ImbretexVariant): string {
  const attr = variant.attributes?.find((a) => a.type === 'color');
  return attr?.hex || '';
}

function getFamily(variant: ImbretexVariant): string {
  return variant.categories?.[0]?.families?.fr || '';
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
                  display: 'inline-block',
                  background: 'rgba(47,111,237,0.15)', border: '1px solid rgba(47,111,237,0.3)',
                  borderRadius: '6px', padding: '3px 10px',
                  color: '#60a5fa', fontSize: '11px', fontWeight: 600,
                }}>
                  {getFamily(mainVariant)}
                </span>
              )}
              <span style={{
                display: 'inline-block',
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

type ProductCardProps = {
  product: ImbretexProduct;
  onView: (product: ImbretexProduct) => void;
};

const ImbretexProductCard = ({ product, onView }: ProductCardProps) => {
  const image = getBestImage(product);
  const mainVariant = product.variants[0];
  const title = mainVariant ? getProductTitle(mainVariant) : product.reference;
  const family = mainVariant ? getFamily(mainVariant) : '';
  const variantCount = product.variants.length;

  return (
    <div
      onClick={() => onView(product)}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '14px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontFamily: 'Inter, sans-serif',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(47,111,237,0.3)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Image */}
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

      {/* Content */}
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
  );
};

// ─── Main Catalog View ───

const ImbretexCatalog = () => {
  const dispatch = useAppDispatch();
  const { products, loading, loadingPrices, priceStockMap, totalProducts, totalPages } =
    useAppSelector((state) => state.imbretex.data);

  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ImbretexProduct | null>(null);
  const [page, setPage] = useState(1);

  // Fetch products on page change
  useEffect(() => {
    dispatch(fetchImbretexProducts({ page, perPage: 50 }));
  }, [page, dispatch]);

  // Extract unique brands from current page
  const brands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.brands?.name) set.add(p.brands.name);
    });
    return Array.from(set).sort();
  }, [products]);

  // Client-side filter (search + brand) on current page
  const filtered = useMemo(() => {
    let result = products;
    if (brandFilter) {
      result = result.filter((p) => p.brands?.name === brandFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((p) => {
        const ref = p.reference?.toLowerCase() || '';
        const brand = p.brands?.name?.toLowerCase() || '';
        const title = p.variants[0] ? getProductTitle(p.variants[0]).toLowerCase() : '';
        return ref.includes(term) || brand.includes(term) || title.includes(term);
      });
    }
    return result;
  }, [products, searchTerm, brandFilter]);

  // When viewing a product detail, fetch its price/stock via product reference
  const handleViewProduct = useCallback((product: ImbretexProduct) => {
    setSelectedProduct(product);
    // Check if we already have prices for this product's variants
    const hasAny = product.variants.some((v) => priceStockMap[v.variantReference]);
    if (!hasAny) {
      dispatch(fetchImbretexPriceStockByRef(product.reference));
    }
  }, [dispatch, priceStockMap]);

  const handlePageChange = (newPage: number) => {
    if (!loading) setPage(newPage);
  };

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
              ({totalProducts} produits)
            </span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '4px' }}>
            Parcourez le catalogue fournisseur — cliquez sur un produit pour voir prix et stocks
          </p>
        </div>
      </div>

      {/* Filters bar */}
      <div style={{
        display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '400px' }}>
          <HiOutlineSearch size={15} style={{
            position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.55)', pointerEvents: 'none',
          }} />
          <input
            type="text"
            placeholder="Rechercher ref, marque, titre..."
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

        {/* Brand filter */}
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

        {/* Count */}
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 500 }}>
          {filtered.length} affiché{filtered.length > 1 ? 's' : ''} sur cette page
        </span>
      </div>

      {/* Product grid */}
      <Loading loading={loading} type="cover">
        {filtered.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '16px',
          }}>
            {filtered.map((product) => (
              <ImbretexProductCard
                key={product.reference}
                product={product}
                onView={handleViewProduct}
              />
            ))}
          </div>
        ) : (
          !loading && (
            <EmptyState
              title="Aucun produit trouvé"
              description={searchTerm || brandFilter
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
              pageSize={50}
              currentPage={page}
              total={totalProducts}
              onChange={handlePageChange}
            />
          </div>
        )}
      </Loading>

      {/* Detail modal */}
      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          priceStockMap={priceStockMap}
          loadingPrices={loadingPrices}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </Container>
  );
};

export default ImbretexCatalog;
