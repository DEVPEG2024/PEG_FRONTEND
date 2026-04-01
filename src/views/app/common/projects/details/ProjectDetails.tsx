import Container from '@/components/shared/Container';
import ProjectHeader from './components/ProjectHeader';
import reducer, { getProjectById, setProject, useAppSelector } from './store';
import Summary from './components/Summary';
import Comments from './components/Comments';
import Files from './components/Files';
import Tasks from './components/Tasks';
import Devis from './components/Devis';
import Invoices from './components/Invoices';
import ProjectChecklist from './components/ProjectChecklist';
import ProjectBat from './components/ProjectBat';
import ClientFilesPanel from '@/components/shared/ClientFiles/ClientFilesPanel';
import { injectReducer, useAppDispatch } from '@/store';
import { useAppSelector as useRootAppSelector } from '@/store';
import { hasRole } from '@/utils/permissions';
import { CUSTOMER, PRODUCER } from '@/constants/roles.constant';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

injectReducer('projectDetails', reducer);

type ProjectDetailsParams = {
  documentId: string;
};

const ProjectDetails = () => {
  const { documentId } =
    useParams<ProjectDetailsParams>() as ProjectDetailsParams;
  const dispatch = useAppDispatch();
  const { project, selectedTab } = useAppSelector(
    (state) => state.projectDetails.data
  );

  useEffect(() => {
    dispatch(getProjectById(documentId));

    return () => {
      dispatch(setProject(undefined));
    };
  }, [dispatch, documentId]);

  const { user } = useRootAppSelector((state) => state.auth.user);
  const isProducer = hasRole(user, [PRODUCER]);
  const isCustomer = hasRole(user, [CUSTOMER]);
  const customerDocId = project?.customer?.documentId;

  return (
    project && (
      <>
        <ProjectHeader project={project} />
        <Container className="h-full">
          {selectedTab === 'Accueil' && <Summary project={project} />}
          {selectedTab === 'Commentaires' && <Comments />}
          {selectedTab === 'Fichiers' && <Files />}
          {selectedTab === 'Fichiers client' && customerDocId && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <ClientFilesPanel
                customerDocumentId={customerDocId}
                mode={isProducer ? 'producer' : isCustomer ? 'customer' : 'admin'}
              />
            </div>
          )}
          {selectedTab === 'Checklist' && <ProjectChecklist />}
          {selectedTab === 'BAT' && <ProjectBat />}
          {selectedTab === 'Devis' && <Devis />}
          {selectedTab === 'Factures' && <Invoices />}
        </Container>
      </>
    )
  );
};

export default ProjectDetails;
