import Container from '@/components/shared/Container';
import BoardHeader from './components/header';
import { useAppSelector } from '../store';
import Home from './components/home';
import Comments from './components/comments';
import { IProject } from '@/@types/project';
import Files from './components/files';
import Tasks from './components/tasks';
import Invoices from './components/invoices';
const ProjectDetails = () => {
  const selectedTab = useAppSelector(
    (state) => state.projectList.data.selectedTab
  );
  const project = useAppSelector(
    (state) => state.projectList.data.selectedProject
  );

  return (
    <>
      <BoardHeader project={project as IProject} />
      <Container className="h-full">
        {/* <Board /> */}
        {selectedTab === 'Accueil' && <Home project={project as IProject} />}
        {selectedTab === 'Commentaires' && (
          <Comments project={project as IProject} />
        )}
        {selectedTab === 'Fichiers' && <Files project={project as IProject} />}
        {selectedTab === 'Tâches' && <Tasks project={project as IProject} />}
        {selectedTab === 'Factures' && (
          <Invoices project={project as IProject} />
        )}
      </Container>
    </>
  );
};

export default ProjectDetails;
