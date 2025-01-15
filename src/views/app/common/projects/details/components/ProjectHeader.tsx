import QuickFilterTab from './QuickFilterTab';
import Container from '@/components/shared/Container';
import AvatarName from '../../lists/components/AvatarName';
import { Project } from '@/@types/project';
import { RootState, useAppDispatch, useAppSelector } from '@/store';
import { Button } from '@/components/ui';
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
    <div className="pt-8 pb-4 border-b border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 headerProject">
      <Container className="px-6">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h3>{project?.name}</h3>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
          <QuickFilterTab />
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-4 mr-4">
              <AvatarName entity={project?.customer} type="Client" />
              {hasRole(user, [SUPER_ADMIN, ADMIN, PRODUCER]) && (
                <AvatarName entity={project?.producer} type="Producteur" />
              )}
            </div>

            {hasRole(user, [SUPER_ADMIN]) && (
              <Button
                size="sm"
                variant="twoTone"
                icon={<HiOutlinePencil />}
                onClick={handleEditProject}
              />
            )}
            {hasRole(user, [SUPER_ADMIN, ADMIN]) && <BoardAddNewTask />}
          </div>
        </div>
      </Container>
      {hasRole(user, [SUPER_ADMIN]) && <ModalEditProject />}
      {hasRole(user, [SUPER_ADMIN, ADMIN]) && <ModalNewTask />}
    </div>
  );
};

export default ProjectHeader;
