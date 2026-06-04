import { Suspense } from 'react';
import Loading from '@/components/shared/Loading';
import {
  protectedRoutes as protectedRoutesRaw,
  publicRoutes as publicRoutesRaw,
} from '@/configs/routes.config';
import appConfig from '@/configs/app.config';
import PageContainer from '@/components/template/PageContainer';
import { Routes, Route, Navigate } from 'react-router-dom';
import type { Routes as AppRoutes } from '@/@types/routes';

// Les tableaux de routes peuvent comporter (ou non) un champ `meta` selon la
// route ; on les type explicitement pour exposer `meta?` de façon uniforme.
const protectedRoutes: AppRoutes = protectedRoutesRaw as AppRoutes;
const publicRoutes: AppRoutes = publicRoutesRaw as AppRoutes;
import { useAppSelector } from '@/store';
import ProtectedRoute from '@/components/route/ProtectedRoute';
import PublicRoute from '@/components/route/PublicRoute';
import AuthorityGuard from '@/components/route/AuthorityGuard';
import AppRoute from '@/components/route/AppRoute';
import type { LayoutType } from '@/@types/theme';

interface ViewsProps {
  pageContainerType?: 'default' | 'gutterless' | 'contained';
  layout?: LayoutType;
}

type AllRoutesProps = ViewsProps;

const { authenticatedEntryPath } = appConfig;

const AllRoutes = (props: AllRoutesProps) => {
  const userAuthority = useAppSelector(
    (state) => state.auth.user.user.authority
  );

  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute />}>
        <Route
          path="/"
          element={<Navigate replace to={authenticatedEntryPath} />}
        />
        {protectedRoutes.map((route, index) => (
          <Route
            key={route.key + index}
            path={route.path}
            element={
              <AuthorityGuard
                userAuthority={userAuthority}
                authority={route.authority}
              >
                <PageContainer {...props} {...route.meta}>
                  <AppRoute
                    routeKey={route.key}
                    component={route.component}
                    {...route.meta}
                  />
                </PageContainer>
              </AuthorityGuard>
            }
          />
        ))}
        <Route path="*" element={<Navigate replace to="/" />} />
      </Route>
      <Route path="/" element={<PublicRoute />}>
        {publicRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <AppRoute
                routeKey={route.key}
                component={route.component}
                {...route.meta}
              />
            }
          />
        ))}
      </Route>
    </Routes>
  );
};

const Views = (props: ViewsProps) => {
  return (
    <Suspense fallback={<Loading loading={true} />}>
      <AllRoutes {...props} />
    </Suspense>
  );
};

export default Views;
