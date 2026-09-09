import { useEffect, useState } from 'react';
const twBreakpoint = {
  xs: '576px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

const breakpointInt = (str = '') => {
  return parseInt(str.replace('px', ''));
};

const breakpoint = {
  '2xl': breakpointInt(twBreakpoint['2xl']), // 1536
  xl: breakpointInt(twBreakpoint.xl), // 1280
  lg: breakpointInt(twBreakpoint.lg), // 1024
  md: breakpointInt(twBreakpoint.md), // 768
  sm: breakpointInt(twBreakpoint.sm), // 640
  xs: breakpointInt(twBreakpoint.xs), // 576
};

const useResponsive = () => {
  const getAllSizes = (comparator = 'smaller') => {
    const currentWindowWidth = window.innerWidth;
    return Object.fromEntries(
      Object.entries(breakpoint).map(([key, value]) => [
        key,
        comparator === 'larger'
          ? // `>=` et non `>` : les deux bornes doivent être COMPLÉMENTAIRES.
            // Avec deux comparaisons strictes, une largeur ÉGALE au point de
            // rupture rendait `larger` ET `smaller` faux — à 768px exactement
            // (iPad 9,7"/10,2"/mini en portrait) le burger (`smaller.md`) et la
            // barre latérale (`larger.md`) disparaissaient tous les deux : plus
            // aucune navigation. Vérification sur `md` (768) :
            //   767 → larger false, smaller true  (inchangé, branche mobile)
            //   768 → larger TRUE,  smaller false (corrigé : branche desktop)
            //   769 → larger true,  smaller false (inchangé, branche desktop)
            // Exactement une branche rend, à toute largeur et pour tous les
            // points de rupture ; rien ne change au-dessus ni en dessous.
            currentWindowWidth >= value
          : currentWindowWidth < value,
      ])
    );
  };

  const getResponsiveState = () => {
    const currentWindowWidth = window.innerWidth;
    return {
      windowWidth: currentWindowWidth,
      larger: getAllSizes('larger'),
      smaller: getAllSizes('smaller'),
    };
  };

  const [responsive, setResponsive] = useState(getResponsiveState());

  const resizeHandler = () => {
    const responsiveState = getResponsiveState();
    setResponsive(responsiveState);
  };

  useEffect(() => {
    window.addEventListener('resize', resizeHandler);
    return () => window.removeEventListener('resize', resizeHandler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responsive.windowWidth]);

  return responsive;
};

export default useResponsive;
