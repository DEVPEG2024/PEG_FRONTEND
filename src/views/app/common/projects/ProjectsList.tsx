import { Container, Loading } from '@/components/shared';
import { useEffect, useState } from 'react';
import { Pagination, Select } from '@/components/ui';
import { HiOutlineSearch, HiPlus } from 'react-icons/hi';

import ProjectListContent from './lists/components/ProjectListContent';
import reducer, {
  deleteProject,
  getProjects,
  setNewProjectDialog,
  useAppDispatch,
  useAppSelector,
} from './store';
import { injectReducer } from '@/store';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN } from '@/constants/roles.constant';
import { Project } from '@/@types/project';
import ModalNewProject from './modals/ModalNewProject';

injectReducer('projects', reducer);

type PageSelection = {
  value: number;
  label: string;
};

const pageSelections: PageSelection[] = [
  { value: 6,  label: '6 / page' },
  { value: 12, label: '12 / page' },
  { value: 18, label: '18 / page' },
  { value: 24, label: '24 / page' },
  { value: 30, label: '30 / page' },
];

const ProjectsList = () => {
  const { user }: { user: User } = useAppSelector((state) => state.auth.user);
  const isAdminOrSuperAdmin = hasRole(user, [SUPER_ADMIN, ADMIN]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSelections[4].value);
  const [searchTerm, setSearchTerm] = useState('');
  const [customersSelected, setCustomersSelected] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const dispatch = useAppDispatch();

  const { total, projects, loading, newProjectDialog } = useAppSelector(
    (state) => state.projects.data
  );

  const customerOptions = Array.from(
    projects
      .reduce((map, { customer }) => {
        if (customer && !map.has(customer.documentId)) {
          map.set(customer.documentId, { value: customer.documentId, label: customer.name });
        }
        return map;
      }, new Map<string, { value: string; label: string }>())
      .values()
  );

  useEffect(() => {
    dispatch(getProjects({ user, pagination: { page: currentPage, pageSize }, searchTerm }));
  }, [currentPage, pageSize, searchTerm]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterByCustomers = (ids: string[]) => {
    setCustomersSelected(ids);
    setCurrentPage(1);
  };

  const handleDeleteProject = (project: Project) => {
    dispatch(deleteProject(project.documentId));
  };

  const filteredProjects = projects
    .filter((p) => customersSelected.length === 0 || customersSelected.includes(p.customer?.documentId || ''))
    .filter((p) => statusFilter === 'all' || p.state === statusFilter);

  return (
    <Container className="h-full" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: '16px', paddingTop: '28px', paddingBottom: '24px', flexWrap: 'wrap',
      }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Gestion
          </p>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Projets{' '}
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', fontWeight: 500 }}>
              ({total})
            </span>
          </h2>
        </div>
        {isAdminOrSuperAdmin && (
          <button
            onClick={() => dispatch(setNewProjectDialog(true))}
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
            <HiPlus size={16} /> Nouveau projet
          </button>
        )}
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {/* Recherche */}
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
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
            onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; }}
          />
        </div>
        {/* Filtre client */}
        <div style={{ flex: 1, minWidth: '180px' }}>
          <Select
            isMulti
            size="md"
            placeholder="Filtrer par client"
            isSearchable
            options={customerOptions}
            onChange={(selected) => handleFilterByCustomers(selected.map((c) => c.value))}
          />
        </div>
      </div>

      {/* Filtres statut */}
      {(() => {
        const tabs = [
          { key: 'all',       label: 'Tous',        color: 'rgba(255,255,255,0.6)',  bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)' },
          { key: 'pending',   label: 'En cours',    color: '#6b9eff',               bg: 'rgba(47,111,237,0.15)',  border: 'rgba(47,111,237,0.35)'  },
          { key: 'fulfilled', label: 'Terminé',     color: '#4ade80',               bg: 'rgba(34,197,94,0.15)',   border: 'rgba(34,197,94,0.35)'   },
          { key: 'waiting',   label: 'En attente',  color: '#fbbf24',               bg: 'rgba(234,179,8,0.15)',   border: 'rgba(234,179,8,0.35)'   },
          { key: 'canceled',  label: 'Annulé',      color: '#f87171',               bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.35)'   },
        ];
        const counts: Record<string, number> = { all: projects.length };
        projects.forEach((p) => { counts[p.state] = (counts[p.state] || 0) + 1; });
        return (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {tabs.map((tab) => {
              const active = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setStatusFilter(tab.key); setCurrentPage(1); }}
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
                  {counts[tab.key] !== undefined && (
                    <span style={{
                      background: active ? tab.border : 'rgba(255,255,255,0.08)',
                      color: active ? tab.color : 'rgba(255,255,255,0.3)',
                      borderRadius: '100px', padding: '1px 7px',
                      fontSize: '10px', fontWeight: 700,
                    }}>
                      {counts[tab.key] ?? 0}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* Liste */}
      <Loading loading={loading}>
        <ProjectListContent
          projects={filteredProjects}
          handleDeleteProject={handleDeleteProject}
        />
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
            defaultValue={pageSelections[4]}
            options={pageSelections}
            onChange={(selected) => selected && setPageSize((selected as PageSelection).value)}
          />
        </div>
      </div>

      {newProjectDialog && <ModalNewProject />}
    </Container>
  );
};

export default ProjectsList;
