import QuickFilterTab from './QuickFilterTab';
import Container from '@/components/shared/Container';
import AvatarName from '../../lists/components/AvatarName';
import { Project } from '@/@types/project';
import { RootState, useAppDispatch, useAppSelector } from '@/store';
import { HiOutlinePencil } from 'react-icons/hi';
import { MdPersonAdd } from 'react-icons/md';
import ModalEditProject from '../modals/ModalEditProject';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, CUSTOMER, PRODUCER, SUPER_ADMIN } from '@/constants/roles.constant';
import { setEditCurrentProjectDialog, updateCurrentProject } from '../store';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { HiOutlineEye } from 'react-icons/hi';

const statusOptions = [
  { value: 'pending',   label: 'En cours',    color: '#6b9eff', bg: 'rgba(47,111,237,0.15)',  border: 'rgba(47,111,237,0.35)' },
  { value: 'fulfilled', label: 'Terminé',     color: '#4ade80', bg: 'rgba(34,197,94,0.15)',   border: 'rgba(34,197,94,0.35)'  },
  { value: 'waiting',   label: 'En attente',  color: '#fbbf24', bg: 'rgba(234,179,8,0.15)',   border: 'rgba(234,179,8,0.35)'  },
  { value: 'canceled',  label: 'Annulé',      color: '#f87171', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.35)'  },
  { value: 'sav',       label: 'SAV',         color: '#fb923c', bg: 'rgba(251,146,60,0.15)',  border: 'rgba(251,146,60,0.35)' },
];

const formatLastSeen = (dateStr: string) => {
  const d = dayjs(dateStr);
  const now = dayjs();
  if (d.isSame(now, 'day')) return `Vu auj. ${d.format('HH:mm')}`;
  if (d.isSame(now.subtract(1, 'day'), 'day')) return `Vu hier ${d.format('HH:mm')}`;
  return `Vu le ${d.format('DD/MM')} à ${d.format('HH:mm')}`;
};

const ProjectHeader = ({ project, customerLastSeen }: { project: Project; customerLastSeen?: string | null }) => {
  const dispatch = useAppDispatch();
  const { user }: { user: User } = useAppSelector(
    (state: RootState) => state.auth.user
  );

  const handleEditProject = () => {
    dispatch(setEditCurrentProjectDialog(true));
  };

  const handleStatusChange = (newState: string) => {
    if (newState !== project.state) {
      dispatch(updateCurrentProject({ documentId: project.documentId, state: newState }));
      const label = statusOptions.find((s) => s.value === newState)?.label ?? newState;
      toast.success(`Statut changé en "${label}"`);
    }
  };

  const assignMeAsProducer = () => {
    if (user.producer?.documentId) {
      dispatch(updateCurrentProject({ documentId: project.documentId, producer: user.producer.documentId }));
      toast.success('Vous êtes maintenant assigné à ce projet');
    }
  };

  const currentStatus = statusOptions.find((s) => s.value === project.state) ?? statusOptions[0];

  return (
    <div style={{
      background: 'linear-gradient(180deg, #0d1b2e 0%, #111827 100%)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      fontFamily: 'Inter, sans-serif',
      paddingTop: '32px',
      paddingBottom: '20px',
    }}>
      <Container className="px-6">
        {/* Row 1 — Title + badge + avatars + edit */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {/* Left: title + badges */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              color: 'rgba(255,255,255,0.35)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: '5px',
            }}>
              Projet
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{
                color: '#fff',
                fontWeight: 700,
                fontSize: '19px',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                margin: 0,
              }}>
                {project?.name}
              </h2>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: currentStatus.bg, border: `1px solid ${currentStatus.border}`,
                borderRadius: '100px', padding: '3px 10px',
                color: currentStatus.color, fontSize: '11px', fontWeight: 700,
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: currentStatus.color }} />
                {currentStatus.label}
              </span>
              {hasRole(user, [SUPER_ADMIN, ADMIN]) && customerLastSeen && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  background: 'rgba(99,102,241,0.10)',
                  border: '1px solid rgba(99,102,241,0.20)',
                  borderRadius: '100px', padding: '3px 10px',
                  fontSize: '10px', fontWeight: 600, color: '#a5b4fc', whiteSpace: 'nowrap',
                }}>
                  <HiOutlineEye size={12} />
                  {formatLastSeen(customerLastSeen)}
                </span>
              )}
            </div>
          </div>

          {/* Right: avatars + actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
            <AvatarName entity={project?.customer} type="Client" />
            {hasRole(user, [SUPER_ADMIN, ADMIN, PRODUCER]) ? (
              <AvatarName entity={project?.producer} type="Producteur" />
            ) : hasRole(user, [CUSTOMER]) && (
              <AvatarName entity={{ documentId: 'peg', name: 'PEG' } as any} type="Producteur" />
            )}

            {hasRole(user, [PRODUCER]) && !project.producer && (
              <button
                onClick={assignMeAsProducer}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'linear-gradient(90deg, #059669, #047857)',
                  border: 'none', borderRadius: '8px', padding: '7px 14px',
                  color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(5,150,105,0.3)',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <MdPersonAdd size={14} />
                M'assigner
              </button>
            )}
            {hasRole(user, [SUPER_ADMIN, ADMIN]) && (
              <button
                onClick={handleEditProject}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'all 0.15s',
                }}
              >
                <HiOutlinePencil size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Row 2 — Status quick-change (admin only) */}
        {hasRole(user, [SUPER_ADMIN, ADMIN]) && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {statusOptions.map((opt) => {
              const isActive = project.state === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleStatusChange(opt.value)}
                  style={{
                    padding: '4px 11px',
                    borderRadius: '100px',
                    border: `1.5px solid ${isActive ? opt.border : 'rgba(255,255,255,0.06)'}`,
                    background: isActive ? opt.bg : 'transparent',
                    color: isActive ? opt.color : 'rgba(255,255,255,0.35)',
                    fontSize: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Tabs */}
        <QuickFilterTab />
      </Container>
      {hasRole(user, [SUPER_ADMIN, ADMIN]) && <ModalEditProject />}
    </div>
  );
};

export default ProjectHeader;
