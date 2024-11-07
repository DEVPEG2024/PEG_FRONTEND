import ProjectListContent from './lists';
import Container from '@/components/shared/Container';
import reducer from './store';
import { injectReducer } from '@/store';
injectReducer('projectList', reducer);

const ProjectList = () => {
  return (
    <Container className="h-full">
      <ProjectListContent />
    </Container>
  );
};

export default ProjectList;
