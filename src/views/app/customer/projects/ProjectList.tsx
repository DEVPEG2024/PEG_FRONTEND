import ProjectListContent from './lists/CustomerProjects';
import Container from '@/components/shared/Container';
import reducer from './store';
import { injectReducer } from '@/store';

injectReducer('customerProjects', reducer);

const ProjectList = () => {
  return (
    <Container className="h-full">
      <ProjectListContent />
    </Container>
  );
};

export default ProjectList;
