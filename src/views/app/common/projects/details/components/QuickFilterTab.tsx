import { labelList } from '../utils';
import { setSelectedTab, useAppDispatch, useAppSelector } from '../store';
import { RootState, useAppSelector as useRootAppSelector } from '@/store';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, CUSTOMER, SUPER_ADMIN } from '@/constants/roles.constant';

const QuickFilterTab = () => {
  const dispatch = useAppDispatch();

  const selectedTab = useAppSelector(
    (state) => state.projectDetails.data.selectedTab
  );
  const { user }: { user: User } = useRootAppSelector(
    (state: RootState) => state.auth.user
  );

  const handleTabChange = (val: string) => {
    dispatch(setSelectedTab(val));
  };

  const tabs = labelList.filter(
    (tab) => tab !== 'Factures' || hasRole(user, [SUPER_ADMIN, ADMIN, CUSTOMER])
  );

  return (
    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
      {tabs.map((tab, index) => {
        const isActive = selectedTab === tab;
        return (
          <button
            key={`${tab}-${index}`}
            onClick={() => handleTabChange(tab)}
            style={{
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
          </button>
        );
      })}
    </div>
  );
};

export default QuickFilterTab;
