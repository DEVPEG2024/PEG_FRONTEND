// Accueil admin : « PEG DISTRICTS » (la ville en rendu 3D) ou le tableau de
// bord classique.
//
// DashboardAdmin.tsx est un composant protégé : on ne le touche pas, ce
// composant choisit seulement quoi afficher. Sous 1024 px (téléphone,
// tablette), le tableau de bord classique reste seul — il bascule lui-même sur
// sa version téléphone. Au-delà, la ville est la vue par défaut et la vue
// classique (« Statistiques ») reste à un clic ; le choix est retenu sur
// l'appareil. « ?mural=1 » ouvre l'écran mural (télévision), quel que soit ce
// choix.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { HiOutlineMap } from 'react-icons/hi';
import lazy from '@/utils/lazyWithRetry';
import useResponsive from '@/utils/hooks/useResponsive';
import DashboardAdmin from './DashboardAdmin';
import { readHomeView, writeHomeView, type HomeView } from './village/homeView';

const AdminVillage = lazy(() => import('./village/AdminVillage'));
const PegDistricts = lazy(() => import('./village/PegDistricts'));

const AdminHome = () => {
  const { larger } = useResponsive();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<HomeView>(readHomeView);
  const choose = (next: HomeView) => {
    writeHomeView(next);
    setView(next);
  };
  /** Écran mural : plein écran demandé au clic même (le navigateur l'exige). */
  const openWall = () => {
    document.documentElement.requestFullscreen?.()?.catch(() => undefined);
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        next.set('mural', '1');
        return next;
      },
      { replace: true }
    );
  };

  if (!larger.lg) return <DashboardAdmin />;
  if (params.get('mural') === '1')
    return <AdminVillage onClassic={() => choose('classic')} />;
  if (view === 'village')
    return (
      <PegDistricts onClassic={() => choose('classic')} onWall={openWall} />
    );

  return (
    <>
      <DashboardAdmin />
      {createPortal(
        <button
          type="button"
          onClick={() => choose('village')}
          className="fixed bottom-6 right-6 z-30 inline-flex h-11 items-center gap-2 rounded-full bg-[#6d5dfc] px-5 text-sm font-bold text-white shadow-lg shadow-black/30 transition hover:-translate-y-0.5 hover:bg-[#5b4ae8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <HiOutlineMap className="text-lg" aria-hidden="true" />
          Vue ville
        </button>,
        document.body
      )}
    </>
  );
};

export default AdminHome;
