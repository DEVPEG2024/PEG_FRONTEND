import { Container, Loading } from '@/components/shared';
import { useEffect, useMemo, useState } from 'react';
import { Pagination, Select } from '@/components/ui';
import { HiOutlineSearch, HiPlus, HiViewGrid, HiViewList, HiSortDescending } from 'react-icons/hi';
import { MdAccessTime } from 'react-icons/md';

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
import { ADMIN, SUPER_ADMIN, CUSTOMER, PRODUCER } from '@/constants/roles.constant';
import { Project } from '@/@types/project';
import ModalNewProject from './modals/ModalNewProject';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  apiGetProjects,
  apiGetCustomerProjects,
  apiGetProducerProjects,
  GetProjectsResponse,
} from '@/services/ProjectServices';
import { unwrapData } from '@/utils/serviceHelper';

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

type SortOption = { value: string; label: string };
const sortOptions: SortOption[] = [
  { value: 'endDate_asc',    label: 'Échéance (proche)' },
  { value: 'endDate_desc',   label: 'Échéance (loin)' },
  { value: 'progress_desc',  label: 'Progression ↓' },
  { value: 'progress_asc',   label: 'Progression ↑' },
  { value: 'price_desc',     label: 'Prix ↓' },
  { value: 'price_asc',      label: 'Prix ↑' },
  { value: 'name_asc',       label: 'Nom A-Z' },
];

const statusTabs = [
  { key: 'all',       label: 'Tous',        color: 'rgba(255,255,255,0.6)',  bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)' },
  { key: 'pending',   label: 'En cours',    color: '#6b9eff',               bg: 'rgba(47,111,237,0.15)',  border: 'rgba(47,111,237,0.35)'  },
  { key: 'fulfilled', label: 'Terminé',     color: '#4ade80',               bg: 'rgba(34,197,94,0.15)',   border: 'rgba(34,197,94,0.35)'   },
  { key: 'waiting',   label: 'En attente',  color: '#fbbf24',               bg: 'rgba(234,179,8,0.15)',   border: 'rgba(234,179,8,0.35)'   },
  { key: 'canceled',  label: 'Annulé',      color: '#f87171',               bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.35)'   },
  { key: 'sav',       label: 'SAV',         color: '#fb923c',               bg: 'rgba(251,146,60,0.15)',  border: 'rgba(251,146,60,0.35)'  },
];

const priorityStyles: Record<string, { label: string; color: string }> = {
  high:   { label: 'Urgent', color: '#f87171' },
  medium: { label: 'Moyen',  color: '#fbbf24' },
  low:    { label: 'Faible', color: '#4ade80' },
};

const statusLabelStyles: Record<string, { label: string; color: string }> = {
  pending:   { label: 'En cours',   color: '#6b9eff' },
  fulfilled: { label: 'Terminé',    color: '#4ade80' },
  waiting:   { label: 'En attente', color: '#fbbf24' },
  canceled:  { label: 'Annulé',     color: '#f87171' },
  sav:       { label: 'SAV',        color: '#fb923c' },
};

function getProjectProgress(project: Project): number {
  const cl = project.checklistItems ?? [];
  if (cl.length > 0) return Math.round((cl.filter((i) => i.done).length / cl.length) * 100);
  const tasks = project.tasks ?? [];
  if (tasks.length > 0) return Math.round((tasks.filter((t) => t.state === 'fulfilled').length / tasks.length) * 100);
  return 0;
}

const ProjectsList = () => {
  const { user }: { user: User } = useAppSelector((state) => state.auth.user);
  const isAdminOrSuperAdmin = hasRole(user, [SUPER_ADMIN, ADMIN]);
  const isSuperAdmin = hasRole(user, [SUPER_ADMIN]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSelections[4].value);
  const [searchTerm, setSearchTerm] = useState('');
  const [customersSelected, setCustomersSelected] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('endDate_asc');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { total, projects, loading, newProjectDialog } = useAppSelector(
    (state) => state.projects.data
  );

  // Status counts — separate lightweight queries per status
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const fetchCounts = async () => {
      const statuses = ['pending', 'fulfilled', 'waiting', 'canceled'];
      const results: Record<string, number> = {};

      const fetchForStatus = async (s: string) => {
        try {
          let res: { projects_connection: GetProjectsResponse };
          if (hasRole(user, [SUPER_ADMIN, ADMIN])) {
            res = await unwrapData(apiGetProjects({ pagination: { page: 1, pageSize: 1 }, searchTerm: '', statusFilter: s }));
          } else if (hasRole(user, [CUSTOMER]) && user.customer?.documentId) {
            res = await unwrapData(apiGetCustomerProjects({ customerDocumentId: user.customer.documentId, pagination: { page: 1, pageSize: 1 }, searchTerm: '', statusFilter: s }));
          } else if (hasRole(user, [PRODUCER]) && user.producer?.documentId) {
            res = await unwrapData(apiGetProducerProjects({ producerDocumentId: user.producer.documentId, pagination: { page: 1, pageSize: 1 }, searchTerm: '', statusFilter: s }));
          } else {
            return;
          }
          results[s] = res.projects_connection.pageInfo.total;
        } catch { /* ignore */ }
      };

      await Promise.all(statuses.map(fetchForStatus));
      results['all'] = Object.values(results).reduce((a, b) => a + b, 0);
      setStatusCounts(results);
    };
    fetchCounts();
  }, [projects]); // re-fetch when projects list changes

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
    dispatch(getProjects({
      user,
      pagination: { page: currentPage, pageSize },
      searchTerm,
      statusFilter: statusFilter === 'all' ? undefined : statusFilter,
    }));
  }, [dispatch, user, currentPage, pageSize, searchTerm, statusFilter]);

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

  // Client-side filtering (customer) + sorting
  const filteredAndSortedProjects = useMemo(() => {
    let result = projects.filter(
      (p) => customersSelected.length === 0 || customersSelected.includes(p.customer?.documentId || '')
    );

    // Sort
    const [field, dir] = sortBy.split('_');
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (field) {
        case 'endDate':
          cmp = new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
          break;
        case 'progress':
          cmp = getProjectProgress(a) - getProjectProgress(b);
          break;
        case 'price':
          cmp = (a.price ?? 0) - (b.price ?? 0);
          break;
        case 'name':
          cmp = (a.name ?? '').localeCompare(b.name ?? '');
          break;
      }
      return dir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [projects, customersSelected, sortBy]);

  return (
    <Container className="h-full" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: '16px', paddingTop: '28px', paddingBottom: '24px', flexWrap: 'wrap',
      }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Gestion
          </p>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Projets{' '}
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', fontWeight: 500 }}>
              ({statusCounts['all'] ?? total})
            </span>
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => setViewMode('cards')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '36px', height: '36px', border: 'none', cursor: 'pointer',
                borderRadius: '10px 0 0 10px',
                background: viewMode === 'cards' ? 'rgba(47,111,237,0.25)' : 'transparent',
                color: viewMode === 'cards' ? '#6b9eff' : 'rgba(255,255,255,0.35)',
              }}
            >
              <HiViewGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '36px', height: '36px', border: 'none', cursor: 'pointer',
                borderRadius: '0 10px 10px 0',
                background: viewMode === 'table' ? 'rgba(47,111,237,0.25)' : 'transparent',
                color: viewMode === 'table' ? '#6b9eff' : 'rgba(255,255,255,0.35)',
              }}
            >
              <HiViewList size={16} />
            </button>
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
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {/* Recherche */}
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <HiOutlineSearch size={15} style={{
            position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.55)', pointerEvents: 'none',
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
        {/* Sort */}
        <div style={{ minWidth: '180px' }}>
          <Select
            size="md"
            isSearchable={false}
            value={sortOptions.find((o) => o.value === sortBy)}
            options={sortOptions}
            onChange={(selected) => selected && setSortBy((selected as SortOption).value)}
          />
        </div>
      </div>

      {/* Status tabs with real counts */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {statusTabs.map((tab) => {
          const active = statusFilter === tab.key;
          const count = statusCounts[tab.key];
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
              {count !== undefined && (
                <span style={{
                  background: active ? tab.border : 'rgba(255,255,255,0.08)',
                  color: active ? tab.color : 'rgba(255,255,255,0.55)',
                  borderRadius: '100px', padding: '1px 7px',
                  fontSize: '10px', fontWeight: 700,
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <Loading loading={loading}>
        {viewMode === 'cards' ? (
          <ProjectListContent
            projects={filteredAndSortedProjects}
            handleDeleteProject={handleDeleteProject}
          />
        ) : (
          /* Table view */
          <div style={{
            background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.07)',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Projet', 'Client', 'Statut',
                    ...(isAdminOrSuperAdmin ? ['Priorité'] : []),
                    'Progression', 'Échéance',
                    ...(isSuperAdmin ? ['Prix'] : []),
                    ...(hasRole(user, [PRODUCER]) ? ['Commission'] : []),
                  ].map((h) => (
                    <th key={h} style={{
                      padding: '12px 14px', textAlign: 'left',
                      color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontWeight: 700,
                      letterSpacing: '0.05em', textTransform: 'uppercase',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedProjects.map((project) => {
                  const progress = getProjectProgress(project);
                  const duration = dayjs(project.endDate).diff(dayjs(), 'day');
                  const st = statusLabelStyles[project.state] ?? statusLabelStyles.pending;
                  const pr = priorityStyles[project.priority];
                  const progressColor = progress > 70 ? '#22c55e' : progress < 40 ? '#ef4444' : '#f59e0b';

                  return (
                    <tr
                      key={project.documentId}
                      onClick={() => navigate(`/common/projects/details/${project.documentId}`)}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Nom */}
                      <td style={{ padding: '12px 14px', color: '#fff', fontWeight: 600, maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {project.name}
                      </td>
                      {/* Client */}
                      <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.6)' }}>
                        {project.customer?.name ?? '—'}
                      </td>
                      {/* Statut */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          background: `${st.color}20`, border: `1px solid ${st.color}50`,
                          borderRadius: '100px', padding: '3px 10px',
                          color: st.color, fontSize: '11px', fontWeight: 700,
                        }}>
                          {st.label}
                        </span>
                      </td>
                      {/* Priorité — admin only */}
                      {isAdminOrSuperAdmin && (
                        <td style={{ padding: '12px 14px' }}>
                          {pr ? (
                            <span style={{
                              color: pr.color, fontSize: '11px', fontWeight: 700,
                            }}>
                              {pr.label}
                            </span>
                          ) : '—'}
                        </td>
                      )}
                      {/* Progression */}
                      <td style={{ padding: '12px 14px', minWidth: '120px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '100px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', width: `${progress}%`,
                              background: progressColor, borderRadius: '100px',
                              transition: 'width 0.3s',
                            }} />
                          </div>
                          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 600, minWidth: '30px', textAlign: 'right' }}>
                            {progress}%
                          </span>
                        </div>
                      </td>
                      {/* Échéance */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <MdAccessTime size={12} style={{ color: duration < 0 ? '#f87171' : 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
                          <span style={{ color: duration < 0 ? '#f87171' : 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {dayjs(project.endDate).format('DD/MM/YY')}
                            <span style={{ marginLeft: '6px', fontSize: '10px', opacity: 0.7 }}>
                              {duration > 0 ? `(${duration}j)` : duration === 0 ? '(Auj.)' : '(Dépassé)'}
                            </span>
                          </span>
                        </div>
                      </td>
                      {/* Prix (SuperAdmin) */}
                      {isSuperAdmin && (
                        <td style={{ padding: '12px 14px', color: '#6b9eff', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {project.price?.toFixed(2)} €
                        </td>
                      )}
                      {/* Commission (Producer) */}
                      {hasRole(user, [PRODUCER]) && (
                        <td style={{ padding: '12px 14px', color: '#a78bfa', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {project.producerPrice?.toFixed(2)} €
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filteredAndSortedProjects.length === 0 && !loading && (
                  <tr>
                    <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: '14px' }}>
                      Aucun projet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
