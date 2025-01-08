import Container from '@/components/shared/Container';
import ProjectHeader from './components/ProjectHeader';
import reducer, { getProjectById, setProject, useAppSelector } from './store';
import Summary from './components/Summary';
import Comments from './components/Comments';
import Files from './components/Files';
import Tasks from './components/Tasks';
import Invoices from './components/Invoices';
import { injectReducer, useAppDispatch } from '@/store';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

injectReducer('projectDetails', reducer);

type ProjectDetailsParams = {
  documentId: string;
};

const ProjectDetails = () => {
  const { documentId } = useParams<ProjectDetailsParams>() as ProjectDetailsParams;
  const dispatch = useAppDispatch();
  const {project, selectedTab} = useAppSelector((state) => state.projectDetails.data);

  useEffect(() => {
    if (!project) {
      dispatch(getProjectById(documentId));
    }

    return () => {
      dispatch(setProject(undefined))
    }
  }, [dispatch]);

  return project && (
    <>
      <ProjectHeader project={project} />
      <Container className="h-full">
        {/* <Board /> */}
        {selectedTab === 'Accueil' && <Summary project={project} />}
        {selectedTab === 'Commentaires' && <Comments />}
        {selectedTab === 'Fichiers' && <Files />}
        {selectedTab === 'Tâches' && <Tasks />}
        {selectedTab === 'Factures' && <Invoices />}
      </Container>
    </>
  );
};

export default ProjectDetails;
