import { Container, Loading } from '@/components/shared';
import { useEffect, useRef, useState } from 'react';
import { Pagination, Select } from '@/components/ui';
import { HiOutlineSearch, HiPlus, HiPhotograph } from 'react-icons/hi';
import { toast } from 'react-toastify';
import { MdDragIndicator } from 'react-icons/md';
import ProductCategoryCard from './components/ProductCategoryCard';
import ModalEditProductCategory from './modals/ModalEditProductCategory';
import ModalDeleteProductCategory from './modals/ModalDeleteProductCategory';
import reducer, {
  getProductCategories,
  setProductCategory,
  updateProductCategory,
  useAppDispatch,
  useAppSelector,
} from './store';
import { injectReducer } from '@/store';
import { ProductCategory } from '@/@types/product';
import { useTranslation } from 'react-i18next';

injectReducer('productCategories', reducer);

type PageOption = { value: number; label: string };
const pageOptions: PageOption[] = [
  { value: 16, label: '16 / page' },
  { value: 24, label: '24 / page' },
  { value: 32, label: '32 / page' },
];

const Categories = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(16);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenEdit, setIsOpenEdit] = useState(false);
  const [orderedCategories, setOrderedCategories] = useState<ProductCategory[]>([]);
  const [orderChanged, setOrderChanged] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const draggedIdx = useRef<number | null>(null);
  const draggedOverIdx = useRef<number | null>(null);
  const isSavingOrder = useRef(false);

  const { productCategories, productCategory, loading, total } = useAppSelector(
    (state) => state.productCategories.data
  );

  useEffect(() => {
    dispatch(getProductCategories({ pagination: { page: currentPage, pageSize }, searchTerm }));
  }, [dispatch, searchTerm, currentPage, pageSize]);

  useEffect(() => {
    if (isSavingOrder.current) return;
    setOrderedCategories([...productCategories]);
    setOrderChanged(false);
  }, [productCategories]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleEditProductCategory = (cat: ProductCategory) => {
    dispatch(setProductCategory(cat));
    setIsOpenEdit(true);
  };

  const handleDeleteProductCategory = (cat: ProductCategory) => {
    dispatch(setProductCategory(cat));
    setIsOpenDelete(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setIsOpenEdit(false);
    setIsOpenDelete(false);
    dispatch(setProductCategory(undefined));
  };

  const handleActivateProductCategory = (cat: ProductCategory, active: boolean) => {
    dispatch(updateProductCategory({
      productCategory: { documentId: cat.documentId, name: cat.name, active },
      imageModified: false,
    }));
    toast.success(active ? 'Catégorie activée' : 'Catégorie désactivée');
  };

  const handleDragStart = (index: number) => {
    draggedIdx.current = index;
    draggedOverIdx.current = null;
    setDraggingIdx(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx.current === null || draggedIdx.current === index) return;
    if (draggedOverIdx.current === index) return;
    draggedOverIdx.current = index;
    const next = [...orderedCategories];
    const [removed] = next.splice(draggedIdx.current, 1);
    next.splice(index, 0, removed);
    draggedIdx.current = index;
    setOrderedCategories(next);
    setOrderChanged(true);
  };

  const handleDragEnd = () => {
    draggedIdx.current = null;
    draggedOverIdx.current = null;
    setDraggingIdx(null);
  };

  const handleSaveOrder = async () => {
    setSavingOrder(true);
    isSavingOrder.current = true;
    try {
      await Promise.all(
        orderedCategories.map((cat, index) =>
          dispatch(updateProductCategory({
            productCategory: { documentId: cat.documentId, name: cat.name, order: index },
            imageModified: false,
          }))
        )
      );
      setOrderChanged(false);
      // Re-fetch pour récupérer les catégories triées par order:asc depuis le backend
      dispatch(getProductCategories({ pagination: { page: currentPage, pageSize }, searchTerm }));
    } catch (e) {
      // Error handled silently
    } finally {
      isSavingOrder.current = false;
      setSavingOrder(false);
    }
  };

  const handleCancelOrder = () => {
    setOrderedCategories([...productCategories]);
    setOrderChanged(false);
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
            Produits
          </p>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Catégories{' '}
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', fontWeight: 500 }}>({total})</span>
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {orderChanged && (
            <>
              <button
                onClick={handleCancelOrder}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px', padding: '10px 16px',
                  color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleSaveOrder}
                disabled={savingOrder}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'linear-gradient(90deg, #059669, #047857)',
                  border: 'none', borderRadius: '10px', padding: '10px 18px',
                  color: '#fff', fontSize: '13px', fontWeight: 600,
                  cursor: savingOrder ? 'not-allowed' : 'pointer',
                  opacity: savingOrder ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(5,150,105,0.4)',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {savingOrder ? 'Sauvegarde…' : '✓ Sauvegarder l\'ordre'}
              </button>
            </>
          )}
          <button
            onClick={() => setIsOpen(true)}
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
            <HiPlus size={16} /> Nouvelle catégorie
          </button>
        </div>
      </div>

      {/* Recherche */}
      <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '400px' }}>
        <HiOutlineSearch size={15} style={{
          position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
          color: 'rgba(255,255,255,0.55)', pointerEvents: 'none',
        }} />
        <input
          type="text"
          placeholder="Rechercher une catégorie…"
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

      <Loading loading={loading}>
        {orderedCategories.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
            {orderedCategories.map((cat, index) => (
              <div
                key={cat.documentId}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                style={{
                  opacity: draggingIdx === index ? 0.4 : 1,
                  transition: 'opacity 0.15s',
                  position: 'relative',
                  cursor: 'grab',
                }}
              >
                {/* Drag handle indicator */}
                <div style={{
                  position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)',
                  zIndex: 10, color: 'rgba(255,255,255,0.25)', pointerEvents: 'none',
                  display: 'flex', alignItems: 'center',
                }}>
                  <MdDragIndicator size={16} />
                </div>
                <ProductCategoryCard
                  productCategory={cat}
                  handleEditProductCategory={handleEditProductCategory}
                  handleDeleteProductCategory={handleDeleteProductCategory}
                  handleActivateProductCategory={handleActivateProductCategory}
                />
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
            borderRadius: '16px', padding: '64px 24px', textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <HiPhotograph size={52} style={{ color: 'rgba(255,255,255,0.1)', margin: '0 auto 14px', display: 'block' }} />
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '15px', fontWeight: 600 }}>Aucune catégorie</p>
          </div>
        )}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
          gap: '12px', marginTop: '32px', paddingBottom: '32px', flexWrap: 'wrap',
        }}>
          <Pagination total={total} currentPage={currentPage} pageSize={pageSize} onChange={(page) => setCurrentPage(page)} />
          <div style={{ minWidth: '120px' }}>
            <Select
              size="sm" isSearchable={false} defaultValue={pageOptions[0]} options={pageOptions}
              onChange={(selected) => selected && setPageSize((selected as PageOption).value)}
            />
          </div>
        </div>
      </Loading>

      {isOpen && (
        <ModalEditProductCategory mode="add" title={t('cat.addCategory')} isOpen={isOpen} handleCloseModal={handleCloseModal} />
      )}
      {productCategory && isOpenEdit && (
        <ModalEditProductCategory mode="edit" title={t('cat.editCategory')} isOpen={isOpenEdit} handleCloseModal={handleCloseModal} />
      )}
      {productCategory && isOpenDelete && (
        <ModalDeleteProductCategory title="Supprimer une catégorie de produit" isOpen={isOpenDelete} handleCloseModal={handleCloseModal} />
      )}
    </Container>
  );
};

export default Categories;
