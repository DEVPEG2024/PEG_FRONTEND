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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pagination, Select } from '@/components/ui';
import { Product } from '@/@types/product';
import { Container, Loading } from '@/components/shared';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN } from '@/constants/roles.constant';
import { OrderItem } from '@/@types/orderItem';
import { apiGetPendingOrderItemsLinkedToProduct } from '@/services/OrderItemServices';
import { unwrapData } from '@/utils/serviceHelper';
import { PegFile } from '@/@types/pegFile';
import { apiDeleteFiles, apiLoadPegFilesAndFiles } from '@/services/FileServices';
import { toast } from 'react-toastify';
import ProductCard from './ProductCard';
import { HiOutlineSearch, HiPlus, HiExclamation } from 'react-icons/hi';
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

  const activeCount = products.filter((p) => p.active).length;
  const inactiveCount = products.filter((p) => !p.active).length;

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
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px',
          }}>
            {products.map((product) => (
              <ProductCard
                key={product.documentId}
                product={product}
                onDeleteModalOpen={handleOnDeleteModalOpen}
                onActivate={handleOnActivate}
                onDuplicate={handleOnDuplicate}
              />
            ))}
          </div>
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
