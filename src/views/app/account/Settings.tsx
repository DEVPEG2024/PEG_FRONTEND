import { useState, useEffect, Suspense, lazy } from 'react';
import Tabs from '@/components/ui/Tabs';
import AdaptableCard from '@/components/shared/AdaptableCard';
import Container from '@/components/shared/Container';
import { useNavigate, useLocation } from 'react-router-dom';

const Profile = lazy(() => import('./components/Profile'));
const Password = lazy(() => import('./components/Password'));

const { TabNav, TabList } = Tabs;

const settingsMenu: Record<
  string,
  {
    label: string;
    path: string;
  }
> = {
  profile: { label: 'Mon compte', path: 'profile' },
  password: { label: 'Mot de passe', path: 'password' },
};

const Settings = () => {
  const [currentTab, setCurrentTab] = useState('profile');

  const navigate = useNavigate();

  const location = useLocation();

  const path = location.pathname.substring(
    location.pathname.lastIndexOf('/') + 1
  );

  const onTabChange = (val: string) => {
    setCurrentTab(val);
    navigate(`/settings/${val}`);
  };

  useEffect(() => {
    setCurrentTab(path);
  }, []);

  return (
    <Container>
      <AdaptableCard>
        <Tabs value={currentTab} onChange={(val) => onTabChange(val)}>
          <TabList>
            {Object.keys(settingsMenu).map((key) => (
              <TabNav key={key} value={key}>
                {settingsMenu[key].label}
              </TabNav>
            ))}
          </TabList>
        </Tabs>
        <div className="px-4 py-6">
          <Suspense fallback={<></>}>
            {currentTab === 'profile' && <Profile />}
            {currentTab === 'password' && <Password onTabChange={onTabChange} />}
          </Suspense>
        </div>
      </AdaptableCard>
    </Container>
  );
};

export default Settings;
