import ProjectListContent from './lists';
import Container from '@/components/shared/Container';
import NewProjectModal from './modals/newProject';
import EditProjectModal from './modals/editProject';

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
