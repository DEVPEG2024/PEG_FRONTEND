import Button from '@/components/ui/Button';
import BoardAddNewTask from '../components/BoardAddNewTask';
import QuickFilterTab from '../components/QuickFilterTab';
import Container from '@/components/shared/Container';
import { HiOutlinePencil } from 'react-icons/hi';
import { setEditProjectDialog, useAppDispatch } from '../../store';
import AvatarName from '../../lists/components/AvatarName';
import { IUser } from '@/@types/user';
import ModalEditProject from '../../modals/editProject';
import { IProject } from '@/@types/project';
import ModalNewTask from '../../modals/newTask';

const BoardHeader = ({ project }: { project: IProject }) => {
  const dispatch = useAppDispatch();
  const handleEditProject = () => {
    dispatch(setEditProjectDialog(true));
  };

  return (
    <div className="pt-8 pb-4 border-b border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 headerProject">
      <Container className="px-6">
        <div className="flex justify-between items-end mb-6">
          <div>
            <p className="mb-1">{project?.ref}</p>
            <h3>{project?.title}</h3>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
          <QuickFilterTab />
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-4 mr-4">
              <AvatarName user={project?.customer as IUser} />
            </div>

            <BoardAddNewTask />
          </div>
        </div>
      </Container>
      <ModalEditProject />
      <ModalNewTask />
    </div>
  );
};

export default BoardHeader;
