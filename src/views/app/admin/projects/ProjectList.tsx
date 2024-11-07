import ProjectListContent from './lists';
import Container from '@/components/shared/Container';
import reducer from './store';
import { injectReducer } from '@/store';
import NewProjectModal from './modals/newProject';
import EditProjectModal from './modals/editProject';

injectReducer('projectList', reducer);

const ProjectList = () => {
  return (
    <Container className="h-full">
      <ProjectListContent />
      <NewProjectModal />
      <EditProjectModal />
    </Container>
  );
};

export default ProjectList;
