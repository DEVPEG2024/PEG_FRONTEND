import classNames from 'classnames';
import GridItem from './GridItem';
import { Project } from '@/@types/project';

const ProjectListContent = ({ projects }: { projects: Project[] }) => {
  return (
    <div className={classNames('mt-6 h-full flex flex-col')}>
      <div className="grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4">
        {projects.map((project) => (
          <GridItem key={project.documentId} data={project} />
        ))}
      </div>
    </div>
  );
};

export default ProjectListContent;
