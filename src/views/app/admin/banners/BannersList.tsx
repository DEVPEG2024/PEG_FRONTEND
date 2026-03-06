import { Container, Loading } from '@/components/shared';
import { useEffect, useState } from 'react';
import { Pagination, Select } from '@/components/ui';
import { HiOutlineSearch, HiPlus, HiPencil, HiTrash, HiPhotograph } from 'react-icons/hi';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, {
  deleteBanner,
  getBanners,
  setEditBannerDialog,
  setNewBannerDialog,
  setSelectedBanner,
  useAppSelector,
} from './store';
import ModalNewBanner from './modals/ModalNewBanner';
import { Banner } from '@/@types/banner';
import ModalEditBanner from './modals/ModalEditBanner';

injectReducer('banners', reducer);

type PageSelection = { value: number; label: string };
const pageSelections: PageSelection[] = [
  { value: 6,  label: '6 / page' },
  { value: 12, label: '12 / page' },
  { value: 24, label: '24 / page' },
];

const BannerCard = ({
  banner,
  onEdit,
  onDelete,
}: {
  banner: Banner;
  onEdit: (b: Banner) => void;
  onDelete: (b: Banner) => void;
}) => (
  <div
    style={{
      background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
      borderRadius: '16px',
      border: `1.5px solid ${banner.active ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)'}`,
      overflow: 'hidden',
      fontFamily: 'Inter, sans-serif',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      display: 'flex',
      flexDirection: 'column',
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.45)';
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    }}
  >
    {/* Preview image */}
    <div style={{ position: 'relative', width: '100%', paddingTop: '28%', background: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
      {banner.image?.url ? (
        <img
          src={banner.image.url}
          alt={banner.name}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '8px',
        }}>
          <HiPhotograph size={32} style={{ color: 'rgba(255,255,255,0.15)' }} />
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>Aucune image</span>
        </div>
      )}
      {/* Statut badge overlay */}
      <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
        <span style={{
          background: banner.active ? 'rgba(34,197,94,0.85)' : 'rgba(239,68,68,0.85)',
          backdropFilter: 'blur(6px)',
          borderRadius: '100px',
          padding: '3px 10px',
          color: '#fff',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.03em',
        }}>
          {banner.active ? 'Actif' : 'Inactif'}
        </span>
      </div>
    </div>

    {/* Body */}
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
      <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {banner.name}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {banner.customer?.name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: '52px' }}>Client</span>
            <span style={{
              background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.25)',
              borderRadius: '100px', padding: '2px 9px',
              color: '#6b9eff', fontSize: '11px', fontWeight: 600,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px',
            }}>
              {banner.customer.name}
            </span>
          </div>
        )}
        {banner.customerCategory?.name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: '52px' }}>Catégo.</span>
            <span style={{
              background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
              borderRadius: '100px', padding: '2px 9px',
              color: '#a78bfa', fontSize: '11px', fontWeight: 600,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px',
            }}>
              {banner.customerCategory.name}
            </span>
          </div>
        )}
      </div>
    </div>

    {/* Footer actions */}
    <div style={{
      display: 'flex', gap: '8px', padding: '12px 16px',
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}>
      <button
        onClick={() => onEdit(banner)}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.25)',
          borderRadius: '8px', padding: '8px',
          color: '#6b9eff', fontSize: '12px', fontWeight: 600,
          cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(47,111,237,0.22)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(47,111,237,0.12)')}
      >
        <HiPencil size={14} /> Modifier
      </button>
      <button
        onClick={() => onDelete(banner)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '8px', padding: '8px 12px',
          color: '#f87171', fontSize: '12px',
          cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.2)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
      >
        <HiTrash size={14} />
      </button>
    </div>
  </div>
);

const BannersList = () => {
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSelections[0].value);
  const [searchTerm, setSearchTerm] = useState('');
  const { banners, total, selectedBanner, newBannerDialog, editBannerDialog } =
    useAppSelector((state) => state.banners.data);

  useEffect(() => {
    dispatch(getBanners({ pagination: { page: currentPage, pageSize }, searchTerm }));
  }, [currentPage, pageSize, searchTerm]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleDeleteBanner = (banner: Banner) => {
    dispatch(deleteBanner(banner.documentId));
  };

  const handleUpdateBanner = (banner: Banner) => {
    dispatch(setSelectedBanner(banner));
    dispatch(setEditBannerDialog(true));
  };

  const activeCount = banners.filter((b) => b.active).length;
  const inactiveCount = banners.filter((b) => !b.active).length;

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: '16px', paddingTop: '28px', paddingBottom: '24px', flexWrap: 'wrap',
      }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Administration
          </p>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Bannières{' '}
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', fontWeight: 500 }}>({total})</span>
          </h2>
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <span style={{ color: '#4ade80', fontSize: '12px', fontWeight: 600 }}>● {activeCount} actives</span>
            <span style={{ color: '#f87171', fontSize: '12px', fontWeight: 600 }}>● {inactiveCount} inactives</span>
          </div>
        </div>
        <button
          onClick={() => dispatch(setNewBannerDialog(true))}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
            border: 'none', borderRadius: '10px',
            padding: '10px 18px',
            color: '#fff', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(47,111,237,0.4)',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <HiPlus size={16} /> Nouvelle bannière
        </button>
      </div>

      {/* Recherche */}
      <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '400px' }}>
        <HiOutlineSearch size={15} style={{
          position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
          color: 'rgba(255,255,255,0.3)', pointerEvents: 'none',
        }} />
        <input
          type="text"
          placeholder="Rechercher une bannière…"
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

      {/* Grille de cartes */}
      <Loading loading={false}>
        {banners.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {banners.map((banner) => (
              <BannerCard
                key={banner.documentId}
                banner={banner}
                onEdit={handleUpdateBanner}
                onDelete={handleDeleteBanner}
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
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '15px', fontWeight: 600 }}>Aucune bannière</p>
            <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '13px', marginTop: '6px' }}>Créez votre première bannière pour commencer</p>
          </div>
        )}
      </Loading>

      {/* Pagination */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
        gap: '12px', marginTop: '32px', paddingBottom: '32px', flexWrap: 'wrap',
      }}>
        <Pagination
          total={total}
          currentPage={currentPage}
          pageSize={pageSize}
          onChange={(page) => setCurrentPage(page)}
        />
        <div style={{ minWidth: '120px' }}>
          <Select
            size="sm"
            isSearchable={false}
            defaultValue={pageSelections[0]}
            options={pageSelections}
            onChange={(selected) => selected && setPageSize((selected as PageSelection).value)}
          />
        </div>
      </div>

      {newBannerDialog && <ModalNewBanner />}
      {editBannerDialog && selectedBanner && <ModalEditBanner />}
    </Container>
  );
};

export default BannersList;
