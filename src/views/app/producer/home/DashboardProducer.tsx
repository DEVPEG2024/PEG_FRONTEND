import { Container } from '@/components/shared';
import { RootState, injectReducer, useAppDispatch } from '@/store';
import { Suspense, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { User } from '@/@types/user';
import { HiOutlineClipboardList, HiOutlineCheckCircle } from 'react-icons/hi';
import { MdOutlinePool } from 'react-icons/md';
import { BsArrowRight } from 'react-icons/bs';
import ProjectItem from '../../common/projects/lists/components/ProjectItem';
import { apiGetPoolProjects } from '@/services/ProjectServices';
import reducer, {
  getDashboardProducerInformations,
  useAppSelector,
} from './store';

injectReducer('dashboardProducer', reducer);

const StatWidget = ({
  icon,
  label,
  value,
  color,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  href?: string;
}) => {
  const inner = (
    <div
      style={{
        background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
        borderRadius: '16px',
        padding: '20px 24px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        fontFamily: 'Inter, sans-serif',
        cursor: href ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (!href) return;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.45)';
      }}
      onMouseLeave={(e) => {
        if (!href) return;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)';
      }}
    >
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px',
        background: color, display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
          {label}
        </p>
        <p style={{ color: '#fff', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
          {value}
        </p>
      </div>
      {href && (
        <BsArrowRight size={18} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
      )}
    </div>
  );

  return href ? <Link to={href} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
};

const DashboardProducer = () => {
  const dispatch = useAppDispatch();
  const { producer } = useAppSelector((state) => state.dashboardProducer.data);
  const { user }: { user: User } = useSelector(
    (state: RootState) => state.auth.user
  );

  useEffect(() => {
    if (user.producer?.documentId) {
      dispatch(getDashboardProducerInformations(user.producer.documentId));
    }
  }, [dispatch, user.producer?.documentId]);

  const [poolCount, setPoolCount] = useState(0);

  useEffect(() => {
    if (user) {
      apiGetPoolProjects({ user, pagination: { page: 1, pageSize: 1 }, searchTerm: '' })
        .then((res: any) => {
          const total = res?.data?.data?.projects_connection?.pageInfo?.total ?? 0;
          setPoolCount(total);
        })
        .catch(() => {});
    }
  }, [user]);

  const projectsDone = producer?.projects.filter((p) => p.state === 'fulfilled').length ?? 0;
  const projectsInProgress = producer?.projects.filter((p) => p.state !== 'fulfilled' && p.state !== 'canceled').length ?? 0;
  const activeProjects = producer?.projects.filter((p) => p.state !== 'fulfilled' && p.state !== 'canceled') ?? [];

  return (
    producer && (
      <Suspense fallback={<></>}>
        {/* Banner */}
        <div style={{ position: 'relative' }}>
          <img
            src="/img/others/peg_producer.jpg"
            alt="Banner"
            style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', display: 'block' }}
          />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '80px',
            background: 'linear-gradient(to top, #0a1628, transparent)',
          }} />
        </div>

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
            Bienvenue sur votre espace producteur
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
                label="Projets terminés"
                value={projectsDone}
                color="rgba(34,197,94,0.18)"
              />
              <StatWidget
                icon={<MdOutlinePool size={22} color="#a78bfa" />}
                label="Voir la piscine"
                value={poolCount}
                color="rgba(139,92,246,0.18)"
                href="/producer/pool"
              />
            </div>

            {/* Projets en cours */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Activité
                  </p>
                  <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, letterSpacing: '-0.01em', margin: 0 }}>
                    Mes projets en cours
                  </h3>
                </div>
                <Link to="/producer/pool">
                  <button style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'linear-gradient(90deg, #7c3aed, #5b21b6)',
                    border: 'none', borderRadius: '10px',
                    padding: '9px 16px',
                    color: '#fff', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(124,58,237,0.4)',
                    fontFamily: 'Inter, sans-serif',
                  }}>
                    <MdOutlinePool size={15} /> Voir la piscine
                  </button>
                </Link>
              </div>

              {activeProjects.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {activeProjects.map((project) => (
                    <ProjectItem key={project.documentId} project={project} />
                  ))}
                </div>
              ) : (
                <div style={{
                  background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
                  borderRadius: '16px',
                  padding: '48px 24px',
                  textAlign: 'center',
                  border: '1px solid rgba(255,255,255,0.07)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                }}>
                  <HiOutlineClipboardList size={48} style={{ color: 'rgba(255,255,255,0.12)', margin: '0 auto 12px' }} />
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px' }}>Aucun projet en cours</p>
                  <Link to="/producer/pool" style={{ textDecoration: 'none' }}>
                    <button style={{
                      marginTop: '16px',
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      background: 'rgba(139,92,246,0.15)',
                      border: '1px solid rgba(139,92,246,0.3)',
                      borderRadius: '10px', padding: '9px 18px',
                      color: '#a78bfa', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}>
                      <MdOutlinePool size={15} /> Consulter la piscine
                    </button>
                  </Link>
                </div>
              )}
            </div>

          </div>
        </Container>
      </Suspense>
    )
  );
};

export default DashboardProducer;
