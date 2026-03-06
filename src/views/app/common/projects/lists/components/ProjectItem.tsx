import ProjectItemDropdown from './ProjectItemDropdown';
import AvatarName from './AvatarName';
import ProgressionBar from './ProgressionBar';
import { useNavigate } from 'react-router-dom';
import { Project } from '@/@types/project';
import { MdAccessTime } from 'react-icons/md';
import dayjs from 'dayjs';
import { RootState, useAppSelector } from '@/store';
import { useState } from 'react';
import ModalPayProducer from '../../modals/ModalPayProducer';
import { hasRole } from '@/utils/permissions';
import { CUSTOMER, PRODUCER, SUPER_ADMIN } from '@/constants/roles.constant';
import { User } from '@/@types/user';

const statusStyles: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: 'En cours',   color: '#6b9eff', bg: 'rgba(47,111,237,0.12)',  border: 'rgba(47,111,237,0.25)' },
  fulfilled: { label: 'Terminé',    color: '#4ade80', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)'  },
  waiting:   { label: 'En attente', color: '#fbbf24', bg: 'rgba(234,179,8,0.12)',   border: 'rgba(234,179,8,0.25)'  },
  canceled:  { label: 'Annulé',     color: '#f87171', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)'  },
};

const ProjectItem = ({
  project,
  handleDeleteProject,
}: {
  project: Project;
  handleDeleteProject?: (project: Project) => void;
}) => {
  const { user }: { user: User } = useAppSelector((state: RootState) => state.auth.user);
  const isSuperAdmin = hasRole(user, [SUPER_ADMIN]);
  const navigate = useNavigate();
  const [isPayProducerOpen, setIsPayProducerOpen] = useState(false);

  const duration = dayjs(project.endDate).diff(dayjs(), 'day');
  const status = statusStyles[project.state] ?? statusStyles.pending;

  const completedTasksCount = project.tasks.filter((t) => t.state === 'fulfilled').length;
  const percentageComplete = project.tasks.length > 0
    ? Math.round((completedTasksCount / project.tasks.length) * 100)
    : 0;

  const handleNavigate = () => navigate(`/common/projects/details/${project.documentId}`);

  return (
    <div
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(-3px)';
        el.style.boxShadow = '0 16px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(47,111,237,0.18)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = '0 2px 16px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05)';
      }}
      style={{
        background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
        borderRadius: '16px',
        padding: '20px',
        fontFamily: 'Inter, sans-serif',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        boxShadow: '0 2px 16px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      {/* Header: nom + statut + dropdown */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        <p
          onClick={handleNavigate}
          style={{
            color: '#fff', fontWeight: 700, fontSize: '15px',
            letterSpacing: '-0.01em', lineHeight: 1.3,
            cursor: 'pointer', flex: 1, minWidth: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {project.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{
            background: status.bg, border: `1px solid ${status.border}`,
            borderRadius: '100px', padding: '3px 10px',
            color: status.color, fontSize: '11px', fontWeight: 600,
          }}>
            {status.label}
          </span>
          {isSuperAdmin && handleDeleteProject && (
            <ProjectItemDropdown
              project={project}
              handleDeleteProject={handleDeleteProject}
              setIsPayProducerOpen={setIsPayProducerOpen}
            />
          )}
        </div>
      </div>

      {/* Prix (role-based) */}
      {isSuperAdmin && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{
            background: 'rgba(47,111,237,0.1)', border: '1px solid rgba(47,111,237,0.2)',
            borderRadius: '100px', padding: '3px 10px',
            color: '#6b9eff', fontSize: '11px', fontWeight: 600,
          }}>
            Projet : {project.price?.toFixed(2)} €
          </span>
          <span style={{
            background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: '100px', padding: '3px 10px',
            color: '#a78bfa', fontSize: '11px', fontWeight: 600,
          }}>
            Producteur : {project.producerPrice?.toFixed(2)} €
          </span>
        </div>
      )}
      {hasRole(user, [PRODUCER]) && (
        <span style={{
          background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: '100px', padding: '3px 10px',
          color: '#a78bfa', fontSize: '11px', fontWeight: 600, alignSelf: 'flex-start',
        }}>
          Producteur : {project.producerPrice?.toFixed(2)} €
        </span>
      )}
      {hasRole(user, [CUSTOMER]) && (
        <span style={{
          background: 'rgba(47,111,237,0.1)', border: '1px solid rgba(47,111,237,0.2)',
          borderRadius: '100px', padding: '3px 10px',
          color: '#6b9eff', fontSize: '11px', fontWeight: 600, alignSelf: 'flex-start',
        }}>
          Total : {project.price?.toFixed(2)} €
        </span>
      )}

      {/* Progression */}
      <div onClick={handleNavigate} style={{ cursor: 'pointer' }}>
        <ProgressionBar progression={percentageComplete} />
      </div>

      {/* Séparateur */}
      <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07) 30%, rgba(255,255,255,0.07) 70%, transparent)' }} />

      {/* Footer: avatars + délai */}
      <div
        onClick={handleNavigate}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', cursor: 'pointer', flexWrap: 'wrap' }}
      >
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <AvatarName entity={project.customer} type="Client" />
          {hasRole(user, [SUPER_ADMIN, PRODUCER]) && (
            <AvatarName entity={project.producer} type="Producteur" />
          )}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          background: duration < 0 ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${duration < 0 ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: '100px', padding: '4px 10px',
        }}>
          <MdAccessTime size={12} style={{ color: duration < 0 ? '#f87171' : 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
          <span style={{ fontSize: '11px', fontWeight: 600, color: duration < 0 ? '#f87171' : 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
            {duration > 0 ? `${duration}j restants` : duration === 0 ? "Aujourd'hui" : 'Dépassé'}
          </span>
        </div>
      </div>

      {isPayProducerOpen && (
        <ModalPayProducer
          project={project}
          isPayProducerOpen={isPayProducerOpen}
          onClosePayProducer={() => setIsPayProducerOpen(false)}
        />
      )}
    </div>
  );
};

export default ProjectItem;
