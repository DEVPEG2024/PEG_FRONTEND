import classNames from 'classnames';
import ProjectItem from './ProjectItem';
import { Project } from '@/@types/project';
import { useEffect, useMemo, useState } from 'react';
import { RootState, useAppSelector } from '@/store';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN } from '@/constants/roles.constant';

const PEG_BACKEND_URL = import.meta.env.DEV ? 'http://localhost:3000' : 'https://peg-backend.vercel.app';

const statusSections = [
  { key: 'pending',   label: 'En cours',         color: '#6b9eff', bg: 'rgba(47,111,237,0.15)',  border: 'rgba(47,111,237,0.35)' },
  { key: 'waiting',   label: 'En attente',        color: '#fbbf24', bg: 'rgba(234,179,8,0.15)',   border: 'rgba(234,179,8,0.35)' },
  { key: 'sav',       label: 'SAV',               color: '#fb923c', bg: 'rgba(251,146,60,0.15)',  border: 'rgba(251,146,60,0.35)' },
  { key: 'unpaid',    label: 'Terminé impayé',    color: '#e879f9', bg: 'rgba(232,121,249,0.15)', border: 'rgba(232,121,249,0.35)' },
  { key: 'canceled',  label: 'Annulé',            color: '#f87171', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.35)' },
  { key: 'fulfilled', label: 'Terminé',           color: '#4ade80', bg: 'rgba(34,197,94,0.15)',   border: 'rgba(34,197,94,0.35)' },
];

const ProjectListContent = ({
  projects,
  handleDeleteProject,
}: {
  projects: Project[];
  handleDeleteProject?: (project: Project) => void;
}) => {
  const { user } = useAppSelector((state: RootState) => state.auth.user);
  const isAdmin = hasRole(user, [SUPER_ADMIN, ADMIN]);
  const [viewsMap, setViewsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAdmin || projects.length === 0) return;
    const fetchViews = async () => {
      const map: Record<string, string> = {};
      await Promise.all(
        projects.map((p) =>
          fetch(`${PEG_BACKEND_URL}/projects/view/${p.documentId}`)
            .then((r) => r.json())
            .then((data) => {
              if (data.views?.length > 0) {
                map[p.documentId] = data.views[0].last_seen;
              }
            })
            .catch(() => {})
        )
      );
      setViewsMap(map);
    };
    fetchViews();
  }, [isAdmin, projects]);

  // Group projects by status, treating fulfilled with paidPrice < price as 'unpaid'
  const grouped = useMemo(() => {
    const map: Record<string, Project[]> = {};
    statusSections.forEach((s) => (map[s.key] = []));
    projects.forEach((p) => {
      const paid = Number(p.paidPrice) || 0;
      const total = Number(p.price) || 0;
      if (p.state === 'fulfilled' && total > 0 && paid < total) {
        map['unpaid'].push(p);
      } else if (map[p.state]) {
        map[p.state].push(p);
      } else {
        map['pending'].push(p);
      }
    });
    return map;
  }, [projects]);

  return (
    <div className={classNames('mt-6 h-full flex flex-col')} style={{ gap: '32px' }}>
      {statusSections.map((section) => {
        const sectionProjects = grouped[section.key];
        if (!sectionProjects || sectionProjects.length === 0) return null;
        return (
          <div key={section.key}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              marginBottom: '14px', paddingBottom: '10px',
              borderBottom: `1px solid ${section.border}`,
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: section.color }} />
              <span style={{ color: section.color, fontSize: '14px', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
                {section.label}
              </span>
              <span style={{
                background: section.bg, border: `1px solid ${section.border}`,
                color: section.color, borderRadius: '100px', padding: '1px 8px',
                fontSize: '11px', fontWeight: 700,
              }}>
                {sectionProjects.length}
              </span>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
              {sectionProjects.map((project) => (
                <ProjectItem
                  key={project.documentId}
                  project={project}
                  handleDeleteProject={handleDeleteProject}
                  customerLastSeen={viewsMap[project.documentId]}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProjectListContent;
