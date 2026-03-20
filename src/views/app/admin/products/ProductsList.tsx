import { injectReducer, RootState } from '@/store';
import reducer, {
  getProducts,
  useAppDispatch,
  useAppSelector,
  setModalDeleteProductOpen,
  setModalDeleteProductClose,
  deleteProduct,
  duplicateProduct,
  updateProduct,
} from './store';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pagination, Select } from '@/components/ui';
import { Product } from '@/@types/product';
import { Container, Loading } from '@/components/shared';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN } from '@/constants/roles.constant';
import { OrderItem } from '@/@types/orderItem';
import { apiGetPendingOrderItemsLinkedToProduct } from '@/services/OrderItemServices';
import { apiGetAllProductsForExport, apiCreateProduct } from '@/services/ProductServices';
import { unwrapData } from '@/utils/serviceHelper';
import { PegFile } from '@/@types/pegFile';
import { apiDeleteFiles, apiLoadPegFilesAndFiles } from '@/services/FileServices';
import { toast } from 'react-toastify';
import ProductCard from './ProductCard';
import { HiOutlineSearch, HiPlus, HiExclamation, HiDownload, HiUpload } from 'react-icons/hi';
import { Link } from 'react-router-dom';

injectReducer('products', reducer);

type PageOption = { value: number; label: string };

const ProductsList = () => {
  const dispatch = useAppDispatch();
  const { user }: { user: User } = useAppSelector(
    (state: RootState) => state.auth.user
  );
  const isAdminOrSuperAdmin: boolean = hasRole(user, [ADMIN, SUPER_ADMIN]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(isAdminOrSuperAdmin ? 100 : 10);
  const [searchTerm, setSearchTerm] = useState('');
  const [productToDelete, setProductToDelete] = useState<Product>();
  const { products, modalDeleteProduct, loading, total } = useAppSelector(
    (state) => state.products.data
  );

  useEffect(() => {
    dispatch(getProducts({ pagination: { page: currentPage, pageSize }, searchTerm }));
  }, [currentPage, pageSize, searchTerm]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const onDeleted = async () => {
    if (productToDelete) {
      dispatch(deleteProduct(productToDelete.documentId));
      const pegFilesToDelete: PegFile[] = await apiLoadPegFilesAndFiles(productToDelete.images);
      apiDeleteFiles(pegFilesToDelete.map((f) => f.id));
    }
    dispatch(setModalDeleteProductClose());
  };

  const onDeleteModalOpen = async (product: Product) => {
    const { orderItems: pending }: { orderItems: OrderItem[] } = await unwrapData(
      apiGetPendingOrderItemsLinkedToProduct(product.documentId)
    );
    if (pending.length > 0) {
      toast.warn('Au moins une commande en cours est rattachée à ce produit');
    } else {
      setProductToDelete(product);
      dispatch(setModalDeleteProductOpen());
    }
  };

  const onDeleteModalClose = () => {
    setProductToDelete(undefined);
    dispatch(setModalDeleteProductClose());
  };

  const onActivate = (product: Product, checked: boolean) => {
    dispatch(updateProduct({ documentId: product.documentId, active: !checked }));
    toast.success(checked ? 'Produit désactivé' : 'Produit activé');
  };

  const onDuplicate = async (product: Product) => {
    dispatch(duplicateProduct(product));
    toast.success('Produit dupliqué');
  };

  const handlePaginationChange = (page: number) => {
    if (!loading) setCurrentPage(page);
  };

  const pageSizeOption: PageOption[] = useMemo(
    () => [10, 25, 50, 100].map((n) => ({ value: n, label: `${n} / page` })),
    []
  );

  const handleSelectChange = (value?: number) => {
    if (!loading) {
      setPageSize(Number(value));
      setCurrentPage(1);
    }
  };

  const handleOnDeleteModalOpen = useCallback((product: Product) => { onDeleteModalOpen(product); }, []);
  const handleOnActivate = useCallback((product: Product, checked: boolean) => { onActivate(product, checked); }, []);
  const handleOnDuplicate = useCallback((product: Product) => { onDuplicate(product); }, []);

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
    }
    result.push(current);
    return result;
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      const text = await file.text();
      const lines = text.replace(/^\uFEFF/, '').split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        toast.error('Fichier CSV vide ou invalide');
        return;
      }

      const headers = parseCsvLine(lines[0]);
      const nomIdx = headers.findIndex(h => h.trim().toLowerCase() === 'nom');
      const descIdx = headers.findIndex(h => h.trim().toLowerCase() === 'description');
      const prixIdx = headers.findIndex(h => h.trim().toLowerCase() === 'prix');
      const paliersIdx = headers.findIndex(h => h.trim().toLowerCase() === 'paliers de prix');
      const actifIdx = headers.findIndex(h => h.trim().toLowerCase() === 'actif');
      const catalogueIdx = headers.findIndex(h => h.trim().toLowerCase() === 'en catalogue');
      const refIdx = headers.findIndex(h => h.trim().toLowerCase() === 'référence');
      const batIdx = headers.findIndex(h => h.trim().toLowerCase() === 'requiert bat');

      if (nomIdx === -1) {
        toast.error('Colonne "Nom" introuvable dans le CSV');
        return;
      }

      let created = 0;
      let errors = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const name = cols[nomIdx]?.trim();
        if (!name) continue;

        const priceTiers: { minQuantity: number; price: number }[] = [];
        if (paliersIdx !== -1 && cols[paliersIdx]) {
          const parts = cols[paliersIdx].split('|').map(s => s.trim());
          for (const part of parts) {
            const match = part.match(/^(\d+)\+:\s*([\d.]+)/);
            if (match) {
              priceTiers.push({ minQuantity: parseInt(match[1]), price: parseFloat(match[2]) });
            }
          }
        }

        const productData: Record<string, unknown> = {
          name,
          description: descIdx !== -1 ? (cols[descIdx] || '') : '',
          price: prixIdx !== -1 && cols[prixIdx] ? parseFloat(cols[prixIdx]) : undefined,
          priceTiers,
          active: actifIdx !== -1 ? cols[actifIdx]?.trim().toLowerCase() === 'oui' : true,
          inCatalogue: catalogueIdx !== -1 ? cols[catalogueIdx]?.trim().toLowerCase() === 'oui' : false,
          productRef: refIdx !== -1 ? (cols[refIdx] || '') : '',
          requiresBat: batIdx !== -1 ? cols[batIdx]?.trim().toLowerCase() === 'oui' : false,
        };

        try {
          await unwrapData(apiCreateProduct(productData as any));
          created++;
        } catch {
          errors++;
        }
      }

      toast.success(`${created} produit${created > 1 ? 's' : ''} importé${created > 1 ? 's' : ''}${errors > 0 ? ` (${errors} erreur${errors > 1 ? 's' : ''})` : ''}`);
      dispatch(getProducts({ pagination: { page: currentPage, pageSize }, searchTerm }));
    } catch {
      toast.error("Erreur lors de l'import");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const { products: allProducts }: { products: Product[] } = await unwrapData(
        apiGetAllProductsForExport()
      );

      const escapeCsv = (val: string) => {
        if (val.includes('"') || val.includes(',') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };

      const headers = [
        'Nom', 'Description', 'Prix', 'Paliers de prix',
        'Actif', 'En catalogue', 'Référence', 'Requiert BAT',
        'Catégorie', 'Tailles', 'Couleurs', 'Catégories clients', 'Images',
      ];

      const rows = allProducts.map((p) => [
        escapeCsv(p.name || ''),
        escapeCsv((p.description || '').replace(/<[^>]*>/g, '')),
        p.price != null ? String(p.price) : '',
        escapeCsv(
          (p.priceTiers || [])
            .map((t) => `${t.minQuantity}+: ${t.price}€`)
            .join(' | ')
        ),
        p.active ? 'Oui' : 'Non',
        p.inCatalogue ? 'Oui' : 'Non',
        escapeCsv(p.productRef || ''),
        p.requiresBat ? 'Oui' : 'Non',
        escapeCsv(p.productCategory?.name || ''),
        escapeCsv((p.sizes || []).map((s) => s.name).join(', ')),
        escapeCsv((p.colors || []).map((c) => c.name).join(', ')),
        escapeCsv((p.customerCategories || []).map((cc) => cc.name).join(', ')),
        escapeCsv((p.images || []).map((img) => img.url).join(', ')),
      ]);

      const bom = '\uFEFF';
      const csv = bom + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `produits-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${allProducts.length} produits exportés`);
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  };

  const activeProducts = useMemo(() => products.filter((p) => p.active), [products]);
  const inactiveProducts = useMemo(() => products.filter((p) => !p.active), [products]);
  const activeCount = activeProducts.length;
  const inactiveCount = inactiveProducts.length;

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: '16px', paddingTop: '28px', paddingBottom: '24px', flexWrap: 'wrap',
      }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Catalogue
          </p>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Produits{' '}
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', fontWeight: 500 }}>({total})</span>
          </h2>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <span style={{ color: '#4ade80', fontSize: '12px', fontWeight: 600 }}>● {activeCount} actifs</span>
            <span style={{ color: '#f87171', fontSize: '12px', fontWeight: 600 }}>● {inactiveCount} inactifs</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '10px', padding: '10px 18px',
              color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600,
              cursor: exporting ? 'wait' : 'pointer',
              opacity: exporting ? 0.5 : 1,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <HiDownload size={16} /> {exporting ? 'Export…' : 'Export CSV'}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '10px', padding: '10px 18px',
              color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600,
              cursor: importing ? 'wait' : 'pointer',
              opacity: importing ? 0.5 : 1,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <HiUpload size={16} /> {importing ? 'Import…' : 'Import CSV'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleImportCSV}
          />
          <Link to="/admin/products/new" style={{ textDecoration: 'none' }}>
            <button
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
                border: 'none', borderRadius: '10px', padding: '10px 18px',
                color: '#fff', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(47,111,237,0.4)',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <HiPlus size={16} /> Nouveau produit
            </button>
          </Link>
        </div>
      </div>

      {/* Recherche */}
      <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '400px' }}>
        <HiOutlineSearch size={15} style={{
          position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
          color: 'rgba(255,255,255,0.3)', pointerEvents: 'none',
        }} />
        <input
          type="text"
          placeholder="Rechercher un produit…"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
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

      <Loading loading={loading} type="cover">
        {products.length > 0 ? (
          <>
            {/* Section Actifs */}
            {activeProducts.length > 0 && (
              <div style={{ marginBottom: '40px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  marginBottom: '16px',
                }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: '#4ade80', boxShadow: '0 0 8px rgba(74,222,128,0.4)',
                  }} />
                  <h3 style={{
                    color: '#fff', fontSize: '16px', fontWeight: 700,
                    letterSpacing: '-0.01em', margin: 0,
                  }}>
                    En ligne
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', fontWeight: 500, marginLeft: '8px' }}>
                      ({activeProducts.length})
                    </span>
                  </h3>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '16px',
                }}>
                  {activeProducts.map((product) => (
                    <ProductCard
                      key={product.documentId}
                      product={product}
                      onDeleteModalOpen={handleOnDeleteModalOpen}
                      onActivate={handleOnActivate}
                      onDuplicate={handleOnDuplicate}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Section Inactifs */}
            {inactiveProducts.length > 0 && (
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  marginBottom: '16px',
                }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: '#f87171', boxShadow: '0 0 8px rgba(248,113,113,0.3)',
                  }} />
                  <h3 style={{
                    color: '#fff', fontSize: '16px', fontWeight: 700,
                    letterSpacing: '-0.01em', margin: 0,
                  }}>
                    Inactifs
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', fontWeight: 500, marginLeft: '8px' }}>
                      ({inactiveProducts.length})
                    </span>
                  </h3>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '16px',
                  opacity: 0.7,
                }}>
                  {inactiveProducts.map((product) => (
                    <ProductCard
                      key={product.documentId}
                      product={product}
                      onDeleteModalOpen={handleOnDeleteModalOpen}
                      onActivate={handleOnActivate}
                      onDuplicate={handleOnDuplicate}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          !loading && (
            <div style={{
              background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
              borderRadius: '16px', padding: '64px 24px', textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <HiOutlineSearch size={48} style={{ color: 'rgba(255,255,255,0.1)', margin: '0 auto 14px', display: 'block' }} />
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '15px', fontWeight: 600 }}>Aucun produit</p>
              <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '13px', marginTop: '6px' }}>Ajoutez votre premier produit pour commencer</p>
            </div>
          )
        )}

        {/* Pagination */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
          gap: '12px', marginTop: '32px', paddingBottom: '32px', flexWrap: 'wrap',
        }}>
          <Pagination
            pageSize={pageSize}
            currentPage={currentPage}
            total={total}
            onChange={handlePaginationChange}
          />
          <div style={{ minWidth: '130px' }}>
            <Select
              size="sm"
              menuPlacement="top"
              isSearchable={false}
              value={pageSizeOption.filter((o) => o.value === pageSize)}
              options={pageSizeOption}
              onChange={(option) => handleSelectChange((option as PageOption)?.value)}
            />
          </div>
        </div>
      </Loading>

      {/* Modal suppression */}
      {modalDeleteProduct && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}
          onClick={onDeleteModalClose}
        >
          <div
            style={{
              background: 'linear-gradient(160deg, #1a2f4a 0%, #111e30 100%)',
              border: '1.5px solid rgba(239,68,68,0.25)',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
              fontFamily: 'Inter, sans-serif',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icône */}
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '20px',
            }}>
              <HiExclamation size={26} style={{ color: '#f87171' }} />
            </div>

            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              Supprimer le produit ?
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', margin: '0 0 28px', lineHeight: 1.5 }}>
              {productToDelete?.name && (
                <><span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>"{productToDelete.name}"</span> sera supprimé définitivement. Cette action est irréversible.</>
              )}
              {!productToDelete?.name && 'Cette action est irréversible.'}
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={onDeleteModalClose}
                style={{
                  flex: 1, padding: '11px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px', color: 'rgba(255,255,255,0.6)',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Annuler
              </button>
              <button
                onClick={onDeleted}
                style={{
                  flex: 1, padding: '11px',
                  background: 'linear-gradient(90deg, #dc2626, #b91c1c)',
                  border: 'none', borderRadius: '10px', color: '#fff',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  boxShadow: '0 4px 14px rgba(220,38,38,0.4)',
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};

export default ProductsList;
