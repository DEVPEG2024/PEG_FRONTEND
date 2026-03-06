import { Container, Loading } from '@/components/shared';
import { useEffect, useState } from 'react';
import { Pagination, Select } from '@/components/ui';
import { HiOutlineSearch, HiPlus, HiPhotograph } from 'react-icons/hi';
import { MdDragIndicator } from 'react-icons/md';
import { DragDropContext, Draggable, DropResult } from 'react-beautiful-dnd';
import StrictModeDroppable from '@/components/shared/StrictModeDroppable';
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
  const [sortMode, setSortMode] = useState(false);
  const [orderedCategories, setOrderedCategories] = useState<ProductCategory[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);

  const { productCategories, productCategory, loading, total } = useAppSelector(
    (state) => state.productCategories.data
  );

  useEffect(() => {
    dispatch(getProductCategories({ pagination: { page: currentPage, pageSize }, searchTerm }));
  }, [dispatch, searchTerm, currentPage, pageSize]);

  useEffect(() => {
    setOrderedCategories([...productCategories]);
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

  const onDragEnd = (result: DropResult) => {
    const { destination, source } = result;
    if (!destination || destination.index === source.index) return;
    const next = [...orderedCategories];
    const [removed] = next.splice(source.index, 1);
    next.splice(destination.index, 0, removed);
    setOrderedCategories(next);
  };

  const handleSaveOrder = async () => {
    setSavingOrder(true);
    try {
      await Promise.all(
        orderedCategories.map((cat, index) =>
          dispatch(updateProductCategory({
            productCategory: { documentId: cat.documentId, name: cat.name, order: index },
            imageModified: false,
          }))
        )
      );
      setSortMode(false);
    } catch (e) {
      console.error('Error saving order', e);
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: '16px', paddingTop: '28px', paddingBottom: '24px', flexWrap: 'wrap',
      }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Produits
          </p>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Catégories{' '}
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', fontWeight: 500 }}>({total})</span>
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {sortMode ? (
            <>
              <button
                onClick={() => { setSortMode(false); setOrderedCategories([...productCategories]); }}
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
          ) : (
            <>
              <button
                onClick={() => setSortMode(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px', padding: '10px 16px',
                  color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >
                <MdDragIndicator size={16} /> Réorganiser
              </button>
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
            </>
          )}
        </div>
      </div>

      {/* Recherche */}
      {!sortMode && (
        <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '400px' }}>
          <HiOutlineSearch size={15} style={{
            position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.3)', pointerEvents: 'none',
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
      )}

      {/* Sort mode hint */}
      {sortMode && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)',
          borderRadius: '10px', padding: '10px 16px', marginBottom: '20px',
          color: '#a78bfa', fontSize: '13px', fontWeight: 500,
        }}>
          <MdDragIndicator size={18} />
          Glissez-déposez les catégories pour les réorganiser, puis sauvegardez.
        </div>
      )}

      <Loading loading={loading}>
        {/* Sort mode — liste D&D verticale */}
        {sortMode ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <StrictModeDroppable droppableId="categories" direction="vertical">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {orderedCategories.map((cat, index) => (
                    <Draggable key={cat.documentId} draggableId={cat.documentId} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          style={{
                            ...provided.draggableProps.style,
                            display: 'flex', alignItems: 'center', gap: '14px',
                            background: snapshot.isDragging
                              ? 'linear-gradient(160deg, #1e3a5f 0%, #162d4a 100%)'
                              : 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
                            border: `1.5px solid ${snapshot.isDragging ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: '14px',
                            padding: '12px 16px',
                            boxShadow: snapshot.isDragging ? '0 16px 40px rgba(0,0,0,0.5)' : '0 2px 10px rgba(0,0,0,0.2)',
                            fontFamily: 'Inter, sans-serif',
                          }}
                        >
                          <div {...provided.dragHandleProps} style={{ color: 'rgba(255,255,255,0.3)', cursor: 'grab', flexShrink: 0 }}>
                            <MdDragIndicator size={22} />
                          </div>
                          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>
                            {index + 1}
                          </span>
                          {cat.image?.url ? (
                            <img src={cat.image.url} alt={cat.name}
                              style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)', flexShrink: 0 }}
                            />
                          ) : (
                            <div style={{
                              width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                              background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.08)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <HiPhotograph size={18} style={{ color: 'rgba(255,255,255,0.2)' }} />
                            </div>
                          )}
                          <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {cat.name}
                          </span>
                          <span style={{
                            background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.25)',
                            borderRadius: '100px', padding: '2px 10px',
                            color: '#6b9eff', fontSize: '11px', fontWeight: 600, flexShrink: 0,
                          }}>
                            {cat.products.length} produit{cat.products.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </StrictModeDroppable>
          </DragDropContext>
        ) : (
          <>
            {productCategories.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                {productCategories.map((cat) => (
                  <ProductCategoryCard
                    key={cat.documentId}
                    productCategory={cat}
                    handleEditProductCategory={handleEditProductCategory}
                    handleDeleteProductCategory={handleDeleteProductCategory}
                  />
                ))}
              </div>
            ) : (
              <div style={{
                background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
                borderRadius: '16px', padding: '64px 24px', textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <HiPhotograph size={52} style={{ color: 'rgba(255,255,255,0.1)', margin: '0 auto 14px', display: 'block' }} />
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '15px', fontWeight: 600 }}>Aucune catégorie</p>
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
          </>
        )}
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
