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
import ProjectSav from './components/ProjectSav';
import DeliveryWizard from './components/DeliveryWizard';
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
  const [deliveryWizardOpen, setDeliveryWizardOpen] = useState(false);
  const isAssignedProducer = isProducer && project?.producer?.documentId && user?.producer?.documentId === project?.producer?.documentId;

  // Track project view — customers only
  useEffect(() => {
    if (!isCustomer || !documentId || !user?.documentId) return;
    fetch(`${PEG_BACKEND_URL}/projects/view/${documentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.documentId }),
    })
      .then((r) => r.json())
      .then((data) => console.log('[ProjectView] POST:', data))
      .catch((err) => console.error('[ProjectView] POST error:', err));
  }, [documentId, user?.documentId]);

  // Admin: fetch last view by customer
  useEffect(() => {
    if (!isAdmin || !documentId) return;
    const fetchView = () => {
      fetch(`${PEG_BACKEND_URL}/projects/view/${documentId}`)
        .then((r) => r.json())
        .then((data) => {
          console.log('[ProjectView] GET:', data);
          if (data.views?.length > 0) {
            setCustomerLastSeen(data.views[0].last_seen);
          }
        })
        .catch((err) => console.error('[ProjectView] GET error:', err));
    };
    fetchView();
    const iv = setInterval(fetchView, 30_000);
    return () => clearInterval(iv);
  }, [isAdmin, documentId]);
  const customerDocId = project?.customer?.documentId;

  return (
    project && (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <ProjectHeader project={project} customerLastSeen={customerLastSeen} />
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Container className="h-full">
            {selectedTab === 'Accueil' && <Summary project={project} />}
            {selectedTab === 'Commentaires' && <Comments />}
            {selectedTab === 'Fichiers' && <Files />}
            {selectedTab === 'Fichiers client' && customerDocId && (
              <div style={{ paddingTop: '20px', paddingBottom: '20px' }}>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                  <ClientFilesPanel
                    customerDocumentId={customerDocId}
                    mode={isProducer ? 'producer' : isCustomer ? 'customer' : 'admin'}
                  />
                </div>
              </div>
            )}
            {selectedTab === 'Checklist' && <ProjectChecklist />}
            {selectedTab === 'BAT' && <ProjectBat />}
            {selectedTab === 'Devis' && <Devis />}
            {selectedTab === 'Factures' && <Invoices />}
            {selectedTab === 'SAV' && <ProjectSav />}
          </Container>
          {/* Delivery wizard for producers */}
          <DeliveryWizard open={deliveryWizardOpen} onClose={() => setDeliveryWizardOpen(false)} />
          {/* Floating delivery button for assigned producers on pending projects */}
          {isAssignedProducer && project?.state === 'pending' && (
            <button
              onClick={() => setDeliveryWizardOpen(true)}
              style={{
                position: 'fixed', bottom: '24px', right: '24px', zIndex: 100,
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '14px 24px', borderRadius: '14px',
                background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                boxShadow: '0 8px 32px rgba(34,197,94,0.4), 0 0 0 1px rgba(34,197,94,0.2)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(34,197,94,0.5)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(34,197,94,0.4)'; }}
            >
              Livrer le projet
            </button>
          )}
        </div>
      </div>
    )
  );
};

export default ProjectDetails;
