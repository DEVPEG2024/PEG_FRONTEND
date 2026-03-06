import QuickFilterTab from './QuickFilterTab';
import Container from '@/components/shared/Container';
import AvatarName from '../../lists/components/AvatarName';
import { Project } from '@/@types/project';
import { RootState, useAppDispatch, useAppSelector } from '@/store';
import { HiOutlinePencil } from 'react-icons/hi';
import BoardAddNewTask from './BoardAddNewTask';
import ModalEditProject from '../modals/ModalEditProject';
import ModalNewTask from '../modals/ModalNewTask';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, PRODUCER, SUPER_ADMIN } from '@/constants/roles.constant';
import { setEditCurrentProjectDialog } from '../store';

const ProjectHeader = ({ project }: { project: Project }) => {
  const dispatch = useAppDispatch();
  const { user }: { user: User } = useAppSelector(
    (state: RootState) => state.auth.user
  );

  const handleEditProject = () => {
    dispatch(setEditCurrentProjectDialog(true));
  };

  return (
    <div style={{
      background: 'linear-gradient(180deg, #0d1b2e 0%, #111827 100%)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      fontFamily: 'Inter, sans-serif',
      paddingTop: '28px',
      paddingBottom: '20px',
    }}>
      <Container className="px-6">
        {/* Project name row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
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

          {/* Right: avatars + action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginRight: '8px' }}>
              <AvatarName entity={project?.customer} type="Client" />
              {hasRole(user, [SUPER_ADMIN, ADMIN, PRODUCER]) && (
                <AvatarName entity={project?.producer} type="Producteur" />
              )}
            </div>

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
            {hasRole(user, [SUPER_ADMIN, ADMIN]) && <BoardAddNewTask />}
          </div>
        </div>

        {/* Tabs row */}
        <QuickFilterTab />
      </Container>
      {hasRole(user, [SUPER_ADMIN]) && <ModalEditProject />}
      {hasRole(user, [SUPER_ADMIN, ADMIN]) && <ModalNewTask />}
    </div>
  );
};

export default ProjectHeader;
