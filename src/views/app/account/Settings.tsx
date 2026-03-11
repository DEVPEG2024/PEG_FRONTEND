import { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { User } from '@/@types/user';

const Profile = lazy(() => import('./components/Profile'));
const Password = lazy(() => import('./components/Password'));
const CompanyProfile = lazy(() => import('./components/CompanyProfile'));

const Settings = () => {
  const [currentTab, setCurrentTab] = useState('profile');
  const navigate = useNavigate();
  const location = useLocation();
  const { user }: { user: User } = useAppSelector((state) => state.auth.user);
  const isCustomer = !!user?.customer;

  const TABS = [
    { key: 'profile', label: 'Mon compte' },
    ...(isCustomer ? [{ key: 'company', label: 'Mon entreprise' }] : []),
    { key: 'password', label: 'Mot de passe' },
  ];
  const path = location.pathname.substring(location.pathname.lastIndexOf('/') + 1);

  const onTabChange = (val: string) => {
    setCurrentTab(val);
    navigate(`/settings/${val}`);
  };

  useEffect(() => {
    setCurrentTab(path);
  }, []);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', display: 'flex', justifyContent: 'center', paddingTop: '36px', paddingBottom: '60px', paddingLeft: '16px', paddingRight: '16px' }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Compte</p>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Paramètres</h2>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '20px' }}>
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => onTabChange(tab.key)}
              style={{ flex: 1, padding: '8px 14px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, background: currentTab === tab.key ? 'rgba(47,111,237,0.2)' : 'transparent', color: currentTab === tab.key ? '#6b9eff' : 'rgba(255,255,255,0.4)', transition: 'all 0.15s' }}
            >{tab.label}</button>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', border: '1.5px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '32px 28px' }}>
          <Suspense fallback={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ height: '44px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} />
              ))}
            </div>
          }>
            {currentTab === 'profile' && <Profile />}
            {currentTab === 'company' && <CompanyProfile />}
            {currentTab === 'password' && <Password onTabChange={onTabChange} />}
          </Suspense>
        </div>

      </div>
    </div>
  );
};

export default Settings;
