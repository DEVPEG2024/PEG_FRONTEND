import Container from '@/components/shared/Container';
import BoardHeader from './components/header';
import reducer, { useAppSelector } from '../store';
import Home from './components/home';
import Comments from './components/comments';
import { Project } from '@/@types/project';
import Files from './components/files';
import Tasks from './components/tasks';
import Invoices from './components/invoices';
import { injectReducer } from '@/store';

injectReducer('adminProjects', reducer);

const ProjectDetails = () => {
  const {selectedTab, selectedProject: project} = useAppSelector(
    (state) => state.adminProjects.data
  );

  return (
    <>
      <BoardHeader project={project as Project} />
      <Container className="h-full">
        {/* <Board /> */}
        {selectedTab === 'Accueil' && <Home project={project as Project} />}
        {selectedTab === 'Commentaires' && (
          <Comments project={project as Project} />
        )}
        {selectedTab === 'Fichiers' && <Files project={project as Project} />}
        {selectedTab === 'Tâches' && <Tasks project={project as Project} />}
        {selectedTab === 'Factures' && (
          <Invoices project={project as Project} />
        )}
      </Container>
    </>
  );
};

export default ProjectDetails;
