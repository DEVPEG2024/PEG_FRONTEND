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
import { ADMIN, CUSTOMER, PRODUCER, SUPER_ADMIN } from '@/constants/roles.constant';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
const PEG_BACKEND_URL = import.meta.env.DEV ? 'http://localhost:3000' : 'https://peg-backend.vercel.app';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';

dayjs.extend(relativeTime);
dayjs.locale('fr');

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
  const isAdmin = hasRole(user, [SUPER_ADMIN, ADMIN]);
  const [customerLastSeen, setCustomerLastSeen] = useState<string | null>(null);

  const token = useRootAppSelector((state) => state.auth.session.token);

  // Customer: track project view
  useEffect(() => {
    if (!isCustomer || !documentId || !user?.documentId || !token) return;
    fetch(`${PEG_BACKEND_URL}/projects/view/${documentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId: user.documentId }),
    }).catch(() => {});
  }, [isCustomer, documentId, user?.documentId, token]);

  // Admin: fetch last view by customer
  useEffect(() => {
    if (!isAdmin || !documentId || !token) return;
    const fetchView = () => {
      fetch(`${PEG_BACKEND_URL}/projects/view/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.views?.length > 0) {
            setCustomerLastSeen(data.views[0].last_seen);
          }
        })
        .catch(() => {});
    };
    fetchView();
    const iv = setInterval(fetchView, 30_000);
    return () => clearInterval(iv);
  }, [isAdmin, documentId, token]);
  const customerDocId = project?.customer?.documentId;

  return (
    project && (
      <>
        <ProjectHeader project={project} customerLastSeen={customerLastSeen} />
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
