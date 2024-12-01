import Container from '@/components/shared/Container';
import BoardHeader from './components/header';
import reducer, { getProjectById, useAppSelector } from '../store';
import Home from './components/home';
import Comments from './components/comments';
import Files from './components/files';
import Tasks from './components/tasks';
import Invoices from './components/invoices';
import { injectReducer, useAppDispatch } from '@/store';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

injectReducer('customerProjects', reducer);

type ProjectDetailsParams = {
  documentId: string;
};

const ProjectDetails = () => {
  const { documentId } = useParams<ProjectDetailsParams>() as ProjectDetailsParams;
  const dispatch = useAppDispatch();
  const selectedTab = useAppSelector(
    (state) => state.customerProjects.data.selectedTab
  );
  const {selectedProject} = useAppSelector(
    (state) => state.customerProjects.data
  );

  useEffect(() => {
    if (!selectedProject) {
      dispatch(getProjectById(documentId));
    }
  }, [dispatch]);

  return selectedProject && (
    <>
      <BoardHeader project={selectedProject} />
      <Container className="h-full">
        {/* <Board /> */}
        {selectedTab === 'Accueil' && <Home project={selectedProject} />}
        {selectedTab === 'Commentaires' && (
          <Comments project={selectedProject} />
        )}
        {selectedTab === 'Fichiers' && <Files project={selectedProject} />}
        {selectedTab === 'Tâches' && <Tasks project={selectedProject} />}
        {selectedTab === 'Factures' && (
          <Invoices project={selectedProject} />
        )}
      </Container>
    </>
  );
};

export default ProjectDetails;
