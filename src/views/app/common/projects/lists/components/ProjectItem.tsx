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
  pending:   { label: 'En cours',   color: '#6b9eff', bg: 'rgba(47,111,237,0.15)',  border: 'rgba(47,111,237,0.35)' },
  fulfilled: { label: 'Terminé',    color: '#4ade80', bg: 'rgba(34,197,94,0.15)',   border: 'rgba(34,197,94,0.35)'  },
  waiting:   { label: 'En attente', color: '#fbbf24', bg: 'rgba(234,179,8,0.15)',   border: 'rgba(234,179,8,0.35)'  },
  canceled:  { label: 'Annulé',     color: '#f87171', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.35)'  },
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
        el.style.boxShadow = `0 20px 48px rgba(0,0,0,0.5), 0 0 0 1.5px ${status.color}60`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = `0 4px 20px rgba(0,0,0,0.3), 0 0 0 1.5px ${status.color}35`;
      }}
      style={{
        background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
        borderRadius: '16px',
        border: `1.5px solid ${status.color}35`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.3), 0 0 0 1.5px ${status.color}35`,
        overflow: 'hidden',
        fontFamily: 'Inter, sans-serif',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Barre de couleur statut */}
      <div style={{ height: '4px', background: status.color, opacity: 0.8 }} />

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'row', gap: '14px' }}>

      {/* Photo du produit à gauche */}
      {project.orderItem?.product?.images?.[0]?.url && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          width: '200px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '8px',
        }}>
          <img
            src={project.orderItem.product.images[0].url}
            alt={project.name}
            style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', display: 'block' }}
          />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minWidth: 0 }}>

        {/* Ligne 1 : statut + délai + dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              background: status.bg, border: `1px solid ${status.border}`,
              borderRadius: '100px', padding: '3px 10px',
              color: status.color, fontSize: '11px', fontWeight: 700, letterSpacing: '0.02em',
            }}>
              {status.label}
            </span>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: duration < 0 ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${duration < 0 ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '100px', padding: '3px 9px',
            }}>
              <MdAccessTime size={11} style={{ color: duration < 0 ? '#f87171' : 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: duration < 0 ? '#f87171' : 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
                {duration > 0 ? `${duration}j` : duration === 0 ? "Auj." : 'Dépassé'}
              </span>
            </div>
          </div>
          {isSuperAdmin && handleDeleteProject && (
            <ProjectItemDropdown
              project={project}
              handleDeleteProject={handleDeleteProject}
              setIsPayProducerOpen={setIsPayProducerOpen}
            />
          )}
        </div>

        {/* Ligne 2 : Nom du projet */}
        <p
          onClick={handleNavigate}
          style={{
            color: '#fff', fontWeight: 700, fontSize: '15px',
            letterSpacing: '-0.01em', lineHeight: 1.3,
            cursor: 'pointer', margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {project.name}
        </p>

        {/* Ligne 3 : Barre de progression */}
        <div onClick={handleNavigate} style={{ cursor: 'pointer' }}>
          <ProgressionBar progression={percentageComplete} />
        </div>

        {/* Séparateur */}
        <div style={{ height: '1px', background: `linear-gradient(90deg, transparent, ${status.color}25 40%, ${status.color}25 60%, transparent)` }} />

        {/* Ligne 4 : Footer — avatars + prix */}
        <div
          onClick={handleNavigate}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', cursor: 'pointer' }}
        >
          {/* Avatars */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', minWidth: 0 }}>
            <AvatarName entity={project.customer} type="Client" />
            {hasRole(user, [SUPER_ADMIN, PRODUCER]) && (
              <AvatarName entity={project.producer} type="Producteur" />
            )}
          </div>

          {/* Prix */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
            {isSuperAdmin && (
              <>
                <span style={{
                  background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.25)',
                  borderRadius: '100px', padding: '2px 9px',
                  color: '#6b9eff', fontSize: '11px', fontWeight: 600,
                }}>
                  {project.price?.toFixed(2)} €
                </span>
                <span style={{
                  background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
                  borderRadius: '100px', padding: '2px 9px',
                  color: '#a78bfa', fontSize: '11px', fontWeight: 600,
                }}>
                  Prod. {project.producerPrice?.toFixed(2)} €
                </span>
              </>
            )}
            {hasRole(user, [PRODUCER]) && (
              <span style={{
                background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
                borderRadius: '100px', padding: '2px 9px',
                color: '#a78bfa', fontSize: '11px', fontWeight: 600,
              }}>
                {project.producerPrice?.toFixed(2)} €
              </span>
            )}
            {hasRole(user, [CUSTOMER]) && (
              <span style={{
                background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.25)',
                borderRadius: '100px', padding: '2px 9px',
                color: '#6b9eff', fontSize: '11px', fontWeight: 600,
              }}>
                {project.price?.toFixed(2)} €
              </span>
            )}
          </div>
        </div>

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
