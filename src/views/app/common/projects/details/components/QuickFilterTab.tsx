import Tabs from '@/components/ui/Tabs';
import { labelList } from '../utils';
import { setSelectedTab, useAppDispatch, useAppSelector } from '../store';
import { RootState, useAppSelector as useRootAppSelector, } from '@/store';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, CUSTOMER, SUPER_ADMIN } from '@/constants/roles.constant';

const { TabNav, TabList } = Tabs;

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

  return (
    <Tabs value={selectedTab} variant="pill" onChange={handleTabChange}>
      <TabList>
        {labelList.filter((tab) => tab !== 'Factures' || hasRole(user, [SUPER_ADMIN, ADMIN, CUSTOMER])).map((tab, index) => (
          <TabNav key={`${tab}-${index}`} value={tab}>
            <span className="text-sm font-semibold text-gray-100">{tab}</span>
          </TabNav>
        ))}
      </TabList>
    </Tabs>
  );
};

export default QuickFilterTab;
