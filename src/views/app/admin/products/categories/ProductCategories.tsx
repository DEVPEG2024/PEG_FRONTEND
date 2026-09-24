import { Container, Loading } from '@/components/shared';
import { useEffect, useRef, useState } from 'react';
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
import CatalogueBanner from '@/views/app/common/categories/CatalogueBanner';

injectReducer('productCategories', reducer);

// Toutes les catégories sur une seule page (une vingtaine en production).
// Paginer côté serveur découpait aussi les sous-catégories, masquées ensuite :
// des catégories racines se retrouvaient en page 2 ou 3.
const ALL_CATEGORIES = { page: 1, pageSize: 1000 };

/** En recherche : tout montrer. Sinon : uniquement les catégories racines. */
const visibleCategories = (list: ProductCategory[], searchTerm: string) =>
  searchTerm.trim() ? list : list.filter((c) => !c.parent?.documentId);

const Categories = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenEdit, setIsOpenEdit] = useState(false);
  const [orderedCategories, setOrderedCategories] = useState<ProductCategory[]>([]);
  const [orderChanged, setOrderChanged] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [addSubParent, setAddSubParent] = useState<ProductCategory | null>(null);
  const draggedIdx = useRef<number | null>(null);
  const draggedOverIdx = useRef<number | null>(null);
  const isSavingOrder = useRef(false);

  const { productCategories, productCategory, loading, total } = useAppSelector(
    (state) => state.productCategories.data
  );

  useEffect(() => {
    dispatch(getProductCategories({ pagination: ALL_CATEGORIES, searchTerm }));
  }, [dispatch, searchTerm]);

  useEffect(() => {
    if (isSavingOrder.current) return;
    setOrderedCategories(visibleCategories(productCategories, searchTerm));
    setOrderChanged(false);
  }, [productCategories, searchTerm]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
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
    setAddSubParent(null);
    dispatch(setProductCategory(undefined));
  };

  const handleAddSubcategory = (parent: ProductCategory) => {
    setAddSubParent(parent);
    dispatch(setProductCategory(undefined));
    setIsOpen(true);
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
      dispatch(getProductCategories({ pagination: ALL_CATEGORIES, searchTerm }));
    } catch (e) {
      // Error handled silently
    } finally {
      isSavingOrder.current = false;
      setSavingOrder(false);
    }
  };

  const handleCancelOrder = () => {
    // Même filtre qu'à l'affichage : sinon « Annuler » faisait remonter les
    // sous-catégories au rang de catégories.
    setOrderedCategories(visibleCategories(productCategories, searchTerm));
    setOrderChanged(false);
  };

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Bannière */}
      <div style={{ paddingTop: '24px' }}>
        <CatalogueBanner title="Catégories" />
      </div>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: '16px', paddingTop: '28px', paddingBottom: '24px', flexWrap: 'wrap',
      }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Produits
          </p>
          <h2 style={{ color: '#fff', fontSize: 'var(--peg-fs-28)', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
            Catégories{' '}
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '18px', fontWeight: 500 }}>({total})</span>
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
        <HiOutlineSearch size={16} style={{
          position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
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
            borderRadius: '999px',
            padding: '12px 16px 12px 44px',
            color: '#fff', fontSize: '14px',
            fontFamily: 'Inter, sans-serif', outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; }}
        />
      </div>

      <Loading loading={loading}>
        {orderedCategories.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: '16px', alignItems: 'start' }}>
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
                  handleAddSubcategory={handleAddSubcategory}
                />
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
            borderRadius: '20px', padding: '64px 24px', textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <HiPhotograph size={52} style={{ color: 'rgba(255,255,255,0.1)', margin: '0 auto 14px', display: 'block' }} />
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '15px', fontWeight: 600 }}>Aucune catégorie</p>
          </div>
        )}
        <div style={{ paddingBottom: '32px' }} />
      </Loading>

      {isOpen && (
        <ModalEditProductCategory mode="add" title={addSubParent ? `Nouvelle sous-catégorie de "${addSubParent.name}"` : t('cat.addCategory')} isOpen={isOpen} handleCloseModal={handleCloseModal} parentCategory={addSubParent} />
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
