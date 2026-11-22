// Accueil admin : le tableau de bord (design « hub », comme la page Master
// Print — par défaut depuis le 22/11/2026) ou « PEG DISTRICTS » (la ville en
// rendu 3D).
//
// DashboardAdmin.tsx est un composant protégé : il calcule tout et rend le
// tableau de bord ; ce composant choisit seulement quoi afficher. Sous 1024 px
// (téléphone, tablette), le tableau de bord reste seul. Au-delà, le bouton
// « Ville PEG » de la bannière ouvre la ville, et « Tableau de bord » dans la
// ville y ramène ; le choix est retenu sur l'appareil. « ?mural=1 » ouvre l'écran
// mural (télévision), quel que soit ce choix.
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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

  return <DashboardAdmin onOpenCity={() => choose('village')} />;
};

export default AdminHome;
