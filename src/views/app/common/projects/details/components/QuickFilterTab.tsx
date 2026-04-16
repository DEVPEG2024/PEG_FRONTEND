import { labelList } from '../utils';
import { setSelectedTab, useAppDispatch, useAppSelector } from '../store';
import { RootState, useAppSelector as useRootAppSelector } from '@/store';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, CUSTOMER, SUPER_ADMIN, PRODUCER } from '@/constants/roles.constant';

const QuickFilterTab = () => {
  const dispatch = useAppDispatch();

  const { selectedTab, project, comments } = useAppSelector(
    (state) => state.projectDetails.data
  );
  const { user }: { user: User } = useRootAppSelector(
    (state: RootState) => state.auth.user
  );

  const handleTabChange = (val: string) => {
    dispatch(setSelectedTab(val));
  };

  const isProducer = hasRole(user, [PRODUCER]);
  const isAssignedProducer = isProducer && project?.producer?.documentId && user?.producer?.documentId === project.producer.documentId;
  const tabs = labelList.filter((tab) => {
    if (tab === 'Devis') return hasRole(user, [SUPER_ADMIN, ADMIN, CUSTOMER]);
    if (tab === 'Factures') return hasRole(user, [SUPER_ADMIN, ADMIN, CUSTOMER]);
    if (tab === 'Dépenses') return hasRole(user, [SUPER_ADMIN, ADMIN]);
    if (tab === 'BAT') return !!project?.orderItem?.product?.requiresBat;
    // Fichiers client : visible pour admin/customer toujours, pour producteur seulement s'il est assigné
    if (tab === 'Fichiers client') return !isProducer || isAssignedProducer;
    // SAV : visible pour admins et clients, ou pour tous quand le projet est en état SAV
    if (tab === 'SAV') return hasRole(user, [SUPER_ADMIN, ADMIN, CUSTOMER]) || project?.state === 'sav';
    return true;
  });

  const getTabCount = (tab: string): number | undefined => {
    switch (tab) {
      case 'Commentaires': return comments?.length;
      case 'Fichiers': return project?.images?.length;
      case 'Checklist': {
        const items = project?.checklistItems ?? [];
        return items.length > 0 ? items.length : undefined;
      }
      case 'Devis': return project?.devis?.length;
      case 'Factures': return project?.invoices?.length;
      case 'SAV': {
        const savTickets = (project as any)?.savTickets ?? [];
        const openCount = savTickets.filter((t: any) => t.status === 'open').length;
        return openCount > 0 ? openCount : undefined;
      }
      default: return undefined;
    }
  };

  return (
    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
      {tabs.map((tab, index) => {
        const isActive = selectedTab === tab;
        const count = getTabCount(tab);
        return (
          <button
            key={`${tab}-${index}`}
            onClick={() => handleTabChange(tab)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px',
              borderRadius: '100px',
              border: isActive ? 'none' : '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.01em',
              fontFamily: 'Inter, sans-serif',
              transition: 'all 0.15s ease',
              background: isActive
                ? 'linear-gradient(90deg, #2f6fed, #1f4bb6)'
                : 'rgba(255,255,255,0.05)',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
              boxShadow: isActive ? '0 3px 12px rgba(47,111,237,0.4)' : 'none',
            }}
          >
            {tab}
            {count !== undefined && count > 0 && (
              <span style={{
                background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                borderRadius: '100px',
                padding: '1px 7px',
                fontSize: '10px',
                fontWeight: 700,
                minWidth: '18px',
                textAlign: 'center',
              }}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default QuickFilterTab;
