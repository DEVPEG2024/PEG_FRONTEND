import { Container, Loading } from '@/components/shared';
import { useEffect, useState } from 'react';
import { Pagination, Select } from '@/components/ui';
import { HiOutlineSearch, HiOutlineClipboardList, HiOutlineClock, HiOutlineCheckCircle } from 'react-icons/hi';
import { MdOutlinePool } from 'react-icons/md';
import dayjs from 'dayjs';

import ProjectListContent from '../../common/projects/lists/components/ProjectListContent';
import reducer, {
  getPoolProjects,
  useAppDispatch,
  useAppSelector,
} from './store';
import { injectReducer } from '@/store';
import { User } from '@/@types/user';

injectReducer('poolProjects', reducer);

type PageSelection = {
  value: number;
  label: string;
};

const pageSelections: PageSelection[] = [
  { value: 6,  label: '6 / page' },
  { value: 12, label: '12 / page' },
  { value: 18, label: '18 / page' },
  { value: 24, label: '24 / page' },
];

const StatWidget = ({
  icon,
  label,
  value,
  color,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  sub?: string;
}) => (
  <div style={{
    background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
    borderRadius: '16px',
    padding: '20px 24px',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    fontFamily: 'Inter, sans-serif',
  }}>
    <div style={{
      width: '48px', height: '48px', borderRadius: '12px',
      background: color, display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0,
    }}>
      {icon}
    </div>
    <div>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
        {label}
      </p>
      <p style={{ color: '#fff', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
      </p>
      {sub && (
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', marginTop: '4px' }}>{sub}</p>
      )}
    </div>
  </div>
);

const PoolProjectsList = () => {
  const { user }: { user: User } = useAppSelector((state) => state.auth.user);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSelections[0].value);
  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const dispatch = useAppDispatch();

  const { total, projects, loading } = useAppSelector(
    (state) => state.poolProjects.data
  );

  useEffect(() => {
    dispatch(getPoolProjects({ user, pagination: { page: currentPage, pageSize }, searchTerm }));
  }, [currentPage, pageSize, searchTerm]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Stat calculations (sur tous les projets chargés)
  const urgentProjects = projects.filter((p) => {
    const days = dayjs(p.endDate).diff(dayjs(), 'day');
    return days >= 0 && days <= 7;
  });
  const withTasksProjects = projects.filter((p) => p.tasks && p.tasks.length > 0);

  // Filtre (client-side sur la page courante)
  const filteredProjects = projects.filter((p) => {
    if (urgencyFilter === 'urgent') {
      const days = dayjs(p.endDate).diff(dayjs(), 'day');
      return days >= 0 && days <= 7;
    }
    if (urgencyFilter === 'with_tasks') return p.tasks && p.tasks.length > 0;
    return true;
  });

  const urgencyTabs = [
    { key: 'all',        label: 'Tous',             color: 'rgba(255,255,255,0.6)',  bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)' },
    { key: 'urgent',     label: '⚡ Urgents (≤7j)', color: '#f87171',               bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.35)'   },
    { key: 'with_tasks', label: 'Tâches définies',  color: '#4ade80',               bg: 'rgba(34,197,94,0.15)',   border: 'rgba(34,197,94,0.35)'   },
  ];

  return (
    <Container className="h-full" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: '16px', paddingTop: '28px', paddingBottom: '24px', flexWrap: 'wrap',
      }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Producteur
          </p>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MdOutlinePool size={24} style={{ color: '#a78bfa' }} />
            La Piscine{' '}
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', fontWeight: 500 }}>
              ({total})
            </span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginTop: '6px' }}>
            Projets disponibles à prendre en charge
          </p>
        </div>
      </div>

      {/* Widgets stat */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '28px' }}>
        <StatWidget
          icon={<HiOutlineClipboardList size={22} color="#a78bfa" />}
          label="Disponibles"
          value={total}
          color="rgba(139,92,246,0.18)"
          sub="projets dans la piscine"
        />
        <StatWidget
          icon={<HiOutlineClock size={22} color="#f87171" />}
          label="Urgents"
          value={urgentProjects.length}
          color="rgba(239,68,68,0.18)"
          sub="deadline ≤ 7 jours"
        />
        <StatWidget
          icon={<HiOutlineCheckCircle size={22} color="#4ade80" />}
          label="Tâches définies"
          value={withTasksProjects.length}
          color="rgba(34,197,94,0.18)"
          sub="projets avec tâches planifiées"
        />
      </div>

      {/* Barre de recherche */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <HiOutlineSearch size={15} style={{
            position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.3)', pointerEvents: 'none',
          }} />
          <input
            type="text"
            placeholder="Rechercher un projet…"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: '10px',
              padding: '10px 14px 10px 36px',
              color: '#fff',
              fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(139,92,246,0.5)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; }}
          />
        </div>
      </div>

      {/* Filtres rapides */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {urgencyTabs.map((tab) => {
          const active = urgencyFilter === tab.key;
          const count = tab.key === 'all' ? projects.length : tab.key === 'urgent' ? urgentProjects.length : withTasksProjects.length;
          return (
            <button
              key={tab.key}
              onClick={() => setUrgencyFilter(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: active ? tab.bg : 'transparent',
                border: `1.5px solid ${active ? tab.border : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '100px',
                padding: '6px 14px',
                color: active ? tab.color : 'rgba(255,255,255,0.35)',
                fontSize: '12px', fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
              <span style={{
                background: active ? tab.border : 'rgba(255,255,255,0.08)',
                color: active ? tab.color : 'rgba(255,255,255,0.3)',
                borderRadius: '100px', padding: '1px 7px',
                fontSize: '10px', fontWeight: 700,
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Liste */}
      <Loading loading={loading}>
        {filteredProjects.length > 0 ? (
          <ProjectListContent projects={filteredProjects} />
        ) : (
          <div style={{
            background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
            borderRadius: '16px',
            padding: '64px 24px',
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          }}>
            <MdOutlinePool size={52} style={{ color: 'rgba(255,255,255,0.1)', margin: '0 auto 14px', display: 'block' }} />
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '15px', fontWeight: 600 }}>La piscine est vide</p>
            <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '13px', marginTop: '6px' }}>Aucun projet ne correspond à ce filtre</p>
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

    </Container>
  );
};

export default PoolProjectsList;
