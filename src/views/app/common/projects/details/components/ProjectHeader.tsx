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
import { ADMIN, PRODUCER, SUPER_ADMIN } from '@/constants/roles.constant';
import { setEditCurrentProjectDialog, updateCurrentProject } from '../store';
import { toast } from 'react-toastify';

const statusOptions = [
  { value: 'pending',   label: 'En cours',    color: '#6b9eff', bg: 'rgba(47,111,237,0.15)',  border: 'rgba(47,111,237,0.35)' },
  { value: 'fulfilled', label: 'Terminé',     color: '#4ade80', bg: 'rgba(34,197,94,0.15)',   border: 'rgba(34,197,94,0.35)'  },
  { value: 'waiting',   label: 'En attente',  color: '#fbbf24', bg: 'rgba(234,179,8,0.15)',   border: 'rgba(234,179,8,0.35)'  },
  { value: 'canceled',  label: 'Annulé',      color: '#f87171', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.35)'  },
];

const ProjectHeader = ({ project }: { project: Project }) => {
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
      paddingTop: '28px',
      paddingBottom: '20px',
      position: 'sticky',
      top: 0,
      zIndex: 20,
    }}>
      <Container className="px-6">
        {/* Project name row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <p style={{
                color: 'rgba(255,255,255,0.3)',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '5px',
              }}>
                Projet
              </p>
              <h2 style={{
                color: '#fff',
                fontWeight: 700,
                fontSize: '22px',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}>
                {project?.name}
              </h2>
            </div>

            {/* Quick status change — admin only */}
            {hasRole(user, [SUPER_ADMIN, ADMIN]) && (
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {statusOptions.map((opt) => {
                  const isActive = project.state === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleStatusChange(opt.value)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '100px',
                        border: `1.5px solid ${isActive ? opt.border : 'rgba(255,255,255,0.08)'}`,
                        background: isActive ? opt.bg : 'transparent',
                        color: isActive ? opt.color : 'rgba(255,255,255,0.3)',
                        fontSize: '11px',
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
          </div>

          {/* Right: avatars + action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginRight: '8px' }}>
              <AvatarName entity={project?.customer} type="Client" />
              {hasRole(user, [SUPER_ADMIN, ADMIN, PRODUCER]) && (
                <AvatarName entity={project?.producer} type="Producteur" />
              )}
            </div>

            {/* Assign me button — prominent for producers */}
            {hasRole(user, [PRODUCER]) && !project.producer && (
              <button
                onClick={assignMeAsProducer}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'linear-gradient(90deg, #059669, #047857)',
                  border: 'none', borderRadius: '10px', padding: '8px 16px',
                  color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 3px 12px rgba(5,150,105,0.4)',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <MdPersonAdd size={16} />
                M'assigner ce projet
              </button>
            )}

            {hasRole(user, [SUPER_ADMIN]) && (
              <button
                onClick={handleEditProject}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '9px',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <HiOutlinePencil size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Tabs row */}
        <QuickFilterTab />
      </Container>
      {hasRole(user, [SUPER_ADMIN]) && <ModalEditProject />}
    </div>
  );
};

export default ProjectHeader;
