import { Container } from '@/components/shared';
import { Switcher } from '@/components/ui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, { getProducers, deleteProducer, toggleProducerActive, useAppSelector } from '../store';
import { Producer } from '@/@types/producer';
import { PRODUCERS_NEW } from '@/constants/navigation.constant';
import { HiOutlineSearch, HiPlus, HiPencil, HiTrash, HiOfficeBuilding, HiMail } from 'react-icons/hi';

injectReducer('producers', reducer);

const AVATAR_COLORS = [
  'rgba(47,111,237,0.3)', 'rgba(168,85,247,0.3)', 'rgba(34,197,94,0.25)',
  'rgba(234,179,8,0.25)', 'rgba(239,68,68,0.25)', 'rgba(20,184,166,0.25)',
]
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
const initials = (name: string) => name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')

const Btn = ({ onClick, icon, hoverBg, hoverColor, hoverBorder, title }: any) => (
  <button title={title} onClick={onClick}
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', transition: 'all 0.15s' }}
    onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = hoverColor; e.currentTarget.style.borderColor = hoverBorder }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
  >{icon}</button>
)

const ProducersList = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const { total, producers, loading } = useAppSelector((state) => state.producers.data);

  useEffect(() => {
    dispatch(getProducers({ pagination: { page: currentPage, pageSize }, searchTerm }));
  }, [currentPage, searchTerm]);

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', paddingTop: '28px', paddingBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Gestion</p>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Producteurs <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', fontWeight: 500 }}>({total})</span>
          </h2>
        </div>
        <button onClick={() => navigate(PRODUCERS_NEW)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)', border: 'none', borderRadius: '10px', padding: '10px 18px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(47,111,237,0.4)', fontFamily: 'Inter, sans-serif' }}>
          <HiPlus size={16} /> Nouveau producteur
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '400px' }}>
        <HiOutlineSearch size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
        <input type="text" placeholder="Rechercher un producteur…" value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '10px 14px 10px 36px', color: '#fff', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)' }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)' }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', height: '68px', border: '1px solid rgba(255,255,255,0.06)' }} />)}
        </div>
      ) : producers.length === 0 ? (
        <div style={{ background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', borderRadius: '16px', padding: '64px 24px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>
          <HiOfficeBuilding size={48} style={{ color: 'rgba(255,255,255,0.1)', margin: '0 auto 14px', display: 'block' }} />
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '15px', fontWeight: 600 }}>Aucun producteur</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '40px' }}>
          {producers.map((p: Producer) => {
            const name = p?.name ?? '?'
            return (
              <div key={p.documentId}
                style={{ background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', border: `1.5px solid ${p.active === false ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', transition: 'border-color 0.15s', opacity: p.active === false ? 0.7 : 1 }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = p.active === false ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.14)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = p.active === false ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)')}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: avatarColor(name), border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>{initials(name)}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>{name}</span>
                    {p?.producerCategory?.name && (
                      <span style={{ background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.25)', borderRadius: '100px', padding: '1px 8px', color: '#6b9eff', fontSize: '11px', fontWeight: 600 }}>{p.producerCategory.name}</span>
                    )}
                    {p.active === false && (
                      <span style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '100px', padding: '1px 8px', color: '#f87171', fontSize: '11px', fontWeight: 600 }}>Inactif</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {p?.companyInformations?.email && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.38)', fontSize: '12px' }}><HiMail size={12} />{p.companyInformations.email}</span>
                    )}
                    {p?.companyInformations?.city && (
                      <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: '12px' }}>{p.companyInformations.city}</span>
                    )}
                  </div>
                </div>
                <Switcher
                  checked={p.active !== false}
                  onChange={() => dispatch(toggleProducerActive({ documentId: p.documentId, active: p.active === false }))}
                />
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <Btn onClick={() => navigate(`/admin/producers/edit/${p.documentId}`, { state: { producerData: p } })} icon={<HiPencil size={14} />} hoverBg="rgba(47,111,237,0.15)" hoverColor="#6b9eff" hoverBorder="rgba(47,111,237,0.4)" title="Modifier" />
                  <Btn onClick={() => dispatch(deleteProducer(p.documentId))} icon={<HiTrash size={14} />} hoverBg="rgba(239,68,68,0.12)" hoverColor="#f87171" hoverBorder="rgba(239,68,68,0.3)" title="Supprimer" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Container>
  );
};

export default ProducersList;
