import QuickFilterTab from '../components/QuickFilterTab';
import Container from '@/components/shared/Container';
import AvatarName from '../../lists/components/AvatarName';
import { Project } from '@/@types/project';

const BoardHeader = ({ project }: { project: Project }) => {
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
              <AvatarName customer={project?.customer} />
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default BoardHeader;
