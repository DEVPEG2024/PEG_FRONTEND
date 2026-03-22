import { Container } from '@/components/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ModalDeleteProducerCategory from './modals/ModalDeleteProducerCategory';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, { getProducerCategories, setProducerCategory, useAppSelector } from './store';
import { ProducerCategory } from '@/@types/producer';
import ModalEditProducerCategory from './modals/ModalEditProducerCategory';
import { HiOutlineSearch, HiPlus, HiPencil, HiTrash, HiOfficeBuilding } from 'react-icons/hi';

injectReducer('producerCategories', reducer);

const Btn = ({ onClick, icon, hoverBg, hoverColor, hoverBorder, title }: any) => (
  <button title={title} onClick={onClick}
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', transition: 'all 0.15s' }}
    onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = hoverColor; e.currentTarget.style.borderColor = hoverBorder }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
  >{icon}</button>
)

const ProducerCategoriesList = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(100);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isOpenEdit, setIsOpenEdit] = useState<boolean>(false);
  const [isOpenDelete, setIsOpenDelete] = useState<boolean>(false);
  const { total, producerCategories, loading, producerCategory } = useAppSelector((state) => state.producerCategories.data);

  useEffect(() => {
    dispatch(getProducerCategories({ pagination: { page: currentPage, pageSize }, searchTerm }));
  }, [currentPage, searchTerm]);

  const handleCloseModal = () => {
    setIsOpen(false); setIsOpenEdit(false); setIsOpenDelete(false);
    dispatch(setProducerCategory(undefined));
  };

  const filtered = producerCategories.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', paddingTop: '28px', paddingBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Producteurs</p>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Catégories producteurs <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', fontWeight: 500 }}>({total})</span>
          </h2>
        </div>
        <button onClick={() => setIsOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)', border: 'none', borderRadius: '10px', padding: '10px 18px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(47,111,237,0.4)', fontFamily: 'Inter, sans-serif' }}>
          <HiPlus size={16} /> Nouvelle catégorie
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '400px' }}>
        <HiOutlineSearch size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.55)', pointerEvents: 'none' }} />
        <input type="text" placeholder="Rechercher une catégorie…" value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '10px 14px 10px 36px', color: '#fff', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)' }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)' }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', height: '56px', border: '1px solid rgba(255,255,255,0.06)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', borderRadius: '16px', padding: '64px 24px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>
          <HiOfficeBuilding size={48} style={{ color: 'rgba(255,255,255,0.1)', margin: '0 auto 14px', display: 'block' }} />
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '15px', fontWeight: 600 }}>Aucune catégorie</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '40px' }}>
          {filtered.map((cat) => (
            <div key={cat.documentId}
              style={{ background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', border: '1.5px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '14px', transition: 'border-color 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'rgba(47,111,237,0.15)', border: '1px solid rgba(47,111,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <HiOfficeBuilding size={16} style={{ color: '#6b9eff' }} />
              </div>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px', flex: 1 }}>{cat.name}</span>
              <span style={{ background: 'rgba(47,111,237,0.1)', border: '1px solid rgba(47,111,237,0.2)', borderRadius: '100px', padding: '2px 10px', color: '#6b9eff', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>
                {cat.producers?.length ?? 0} producteur{(cat.producers?.length ?? 0) !== 1 ? 's' : ''}
              </span>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <Btn onClick={() => { dispatch(setProducerCategory(cat)); setIsOpenEdit(true); }} icon={<HiPencil size={13} />} hoverBg="rgba(47,111,237,0.15)" hoverColor="#6b9eff" hoverBorder="rgba(47,111,237,0.4)" title="Modifier" />
                <Btn onClick={() => { dispatch(setProducerCategory(cat)); setIsOpenDelete(true); }} icon={<HiTrash size={13} />} hoverBg="rgba(239,68,68,0.12)" hoverColor="#f87171" hoverBorder="rgba(239,68,68,0.3)" title="Supprimer" />
              </div>
            </div>
          ))}
        </div>
      )}

      {producerCategory && isOpenEdit && <ModalEditProducerCategory mode="edit" title={t('cat.editCategory')} isOpen={isOpenEdit} handleCloseModal={handleCloseModal} />}
      {isOpen && <ModalEditProducerCategory mode="add" title={t('cat.addCategory')} isOpen={isOpen} handleCloseModal={handleCloseModal} />}
      {producerCategory && isOpenDelete && <ModalDeleteProducerCategory title={t('cat.deleteCategory')} isOpen={isOpenDelete} handleCloseModal={handleCloseModal} />}
    </Container>
  );
};

export default ProducerCategoriesList;
