import { Container } from '@/components/shared';
import { RootState, injectReducer, useAppDispatch } from '@/store';
import { Suspense, useEffect } from 'react';
import { useSelector } from 'react-redux';
import HomeProductsList from './HomeProductsList';
import { BsArrowRight } from 'react-icons/bs';
import { Link, useNavigate } from 'react-router-dom';
import { User } from '@/@types/user';
import { HiOutlineClipboardList, HiOutlineCheckCircle, HiOutlineCollection } from 'react-icons/hi';
import reducer, {
  getDashboardCustomerInformations,
  useAppSelector,
} from './store';

injectReducer('dashboardCustomer', reducer);

const StatWidget = ({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) => (
  <div style={{
    background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
    borderRadius: '16px',
    padding: '20px 24px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    fontFamily: 'Inter, sans-serif',
  }}>
    <div style={{
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      background: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      {icon}
    </div>
    <div>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
        {label}
      </p>
      <p style={{ color: '#fff', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
      </p>
    </div>
  </div>
);

const DashboardCustomer = () => {
  const dispatch = useAppDispatch();
  const { customer, products, projects, loading } = useAppSelector(
    (state) => state.dashboardCustomer.data
  );
  const { user }: { user: User } = useSelector(
    (state: RootState) => state.auth.user!
  );

  useEffect(() => {
    if (user.customer?.documentId) {
      dispatch(getDashboardCustomerInformations(user.customer.documentId));
    }
  }, [dispatch, user.customer?.documentId]);

  const navigate = useNavigate();
  const projectsDone = projects.filter((p) => p.state === 'fulfilled').length;
  const projectsInProgress = projects.filter((p) => p.state !== 'fulfilled' && p.state !== 'canceled').length;
  const pendingBats = projects.filter(
    (p) => p.orderItem?.product?.requiresBat && p.orderItem?.product?.batFile?.url && (!p.orderItem?.batStatus || p.orderItem?.batStatus === 'pending')
  );

  if (loading) {
    return (
      <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ height: '80px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    );
  }

  if (!customer) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', fontFamily: 'Inter, sans-serif', flexDirection: 'column', gap: '12px',
      }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px' }}>
          Bienvenue, {user?.firstName || user?.email} 👋
        </p>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>
          Votre espace est en cours de configuration. Revenez dans quelques instants.
        </p>
      </div>
    );
  }

  return (
    customer && (
      <Suspense fallback={<></>}>
        {/* Banner */}
        {customer.banner ? (
          <div style={{ position: 'relative' }}>
            <img
              src={customer.banner.image.url}
              alt="Banner"
              style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', display: 'block' }}
            />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: '80px',
              background: 'linear-gradient(to top, #0a1628, transparent)',
            }} />
          </div>
        ) : (
          <div style={{
            position: 'relative',
            width: '100%',
            height: '180px',
            background: 'linear-gradient(135deg, #0d1f3c 0%, #1a3a6e 35%, #0f2d5a 60%, #081524 100%)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            padding: '0 40px',
          }}>
            {/* Cercles décoratifs */}
            <div style={{
              position: 'absolute', top: '-40px', right: '10%',
              width: '200px', height: '200px', borderRadius: '50%',
              background: 'rgba(47,111,237,0.12)',
              border: '1px solid rgba(47,111,237,0.15)',
            }} />
            <div style={{
              position: 'absolute', bottom: '-60px', right: '25%',
              width: '160px', height: '160px', borderRadius: '50%',
              background: 'rgba(47,111,237,0.07)',
              border: '1px solid rgba(47,111,237,0.1)',
            }} />
            <div style={{
              position: 'absolute', top: '20px', right: '5%',
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'rgba(107,158,255,0.08)',
            }} />
            {/* Grille de points */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }} />
            {/* Contenu */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                background: 'rgba(47,111,237,0.15)',
                border: '1px solid rgba(47,111,237,0.25)',
                borderRadius: '100px', padding: '4px 12px', marginBottom: '12px',
              }}>
                <div style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: '#6b9eff', boxShadow: '0 0 6px rgba(107,158,255,0.8)',
                }} />
                <span style={{ color: '#6b9eff', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Bienvenue sur PEG
                </span>
              </div>
              <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
                Votre espace client
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginTop: '6px' }}>
                Découvrez vos offres et suivez vos projets
              </p>
            </div>
            {/* Dégradé bas */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: '60px',
              background: 'linear-gradient(to top, #0d1b2e, transparent)',
            }} />
          </div>
        )}

        {/* Welcome header */}
        <div style={{
          background: 'linear-gradient(180deg, #0d1b2e 0%, #0a1628 100%)',
          padding: '28px 32px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          fontFamily: 'Inter, sans-serif',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
            Tableau de bord
          </p>
          <h2 style={{ color: '#fff', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Bonjour, {user?.firstName} 👋
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginTop: '6px' }}>
            Bienvenue sur votre espace client
          </p>
        </div>

        <Container style={{ fontFamily: 'Inter, sans-serif' }}>
          <div style={{ paddingTop: '28px', paddingBottom: '40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* Stat widgets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <StatWidget
                icon={<HiOutlineClipboardList size={22} color="#6b9eff" />}
                label="Projets en cours"
                value={projectsInProgress}
                color="rgba(47,111,237,0.18)"
              />
              <StatWidget
                icon={<HiOutlineCheckCircle size={22} color="#4ade80" />}
                label="Projets réalisés"
                value={projectsDone}
                color="rgba(34,197,94,0.18)"
              />
              <StatWidget
                icon={<HiOutlineCollection size={22} color="#a78bfa" />}
                label="Offres personnalisées"
                value={products.length}
                color="rgba(139,92,246,0.18)"
              />
            </div>

            {/* BAT en attente */}
            {pendingBats.length > 0 && (
              <div>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Bon à Tirer — Validation requise
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pendingBats.map((p) => (
                    <div
                      key={p.documentId}
                      onClick={() => navigate(`/customer/product/${p.orderItem!.product.documentId}?orderItemId=${p.orderItem!.documentId}`)}
                      style={{
                        background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 100%)',
                        border: '1.5px solid rgba(168,85,247,0.3)',
                        borderRadius: '12px',
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>📄</span>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: '#c084fc' }}>{p.name}</p>
                          <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.55)', marginTop: '2px' }}>{p.orderItem!.product.name}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#c084fc', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '8px', padding: '4px 10px', whiteSpace: 'nowrap' }}>
                        Valider →
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Personalized offers */}
            <div>
              {/* Section header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Catalogue personnalisé
                  </p>
                  <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, letterSpacing: '-0.01em', margin: 0 }}>
                    Mes offres personnalisées
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <Link to="/customer/products">
                    <button style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
                      border: 'none', borderRadius: '10px',
                      padding: '9px 16px',
                      color: '#fff', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(47,111,237,0.4)',
                      fontFamily: 'Inter, sans-serif',
                    }}>
                      Toutes mes offres <BsArrowRight size={14} />
                    </button>
                  </Link>
                  {user.customer?.catalogAccess !== false && (
                    <Link to="/customer/catalogue">
                      <button style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px',
                        padding: '9px 16px',
                        color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif',
                      }}>
                        Catalogue <BsArrowRight size={14} />
                      </button>
                    </Link>
                  )}
                </div>
              </div>

              {/* Products grid */}
              {products.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                  <HomeProductsList products={products} />
                </div>
              ) : (
                <div style={{
                  background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
                  borderRadius: '16px',
                  padding: '48px 24px',
                  textAlign: 'center',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
                }}>
                  <HiOutlineCollection size={48} style={{ color: 'rgba(255,255,255,0.12)', margin: '0 auto 12px' }} />
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px' }}>Aucune offre personnalisée disponible</p>
                </div>
              )}
            </div>
          </div>
        </Container>
      </Suspense>
    )
  );
};

export default DashboardCustomer;
