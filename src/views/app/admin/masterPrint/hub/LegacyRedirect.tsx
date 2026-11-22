/*
 * Anciennes adresses Master Print (`/admin/master-print/catalog`, `/orders`,
 * avant le 22/11/2026) → onglet correspondant de la page Master Print.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { legacyTarget } from '@/utils/masterPrintHub';

const LegacyRedirect = () => {
  const { pathname, search } = useLocation();
  return <Navigate to={legacyTarget(pathname, search)} replace />;
};

export default LegacyRedirect;
