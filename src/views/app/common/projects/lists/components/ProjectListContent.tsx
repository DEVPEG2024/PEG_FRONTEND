import classNames from 'classnames';
import ProjectItem from './ProjectItem';
import { Project } from '@/@types/project';

const ProjectListContent = ({
  projects,
  handleDeleteProject,
}: {
  projects: Project[];
  handleDeleteProject?: (project: Project) => void;
}) => {
  return (
    <div className={classNames('mt-6 h-full flex flex-col')}>
      <div className="grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4">
        {projects.map((project) => (
          <ProjectItem key={project.documentId} project={project} handleDeleteProject={handleDeleteProject} />
        ))}
      </div>
    </div>
  );
};

export default ProjectListContent;
