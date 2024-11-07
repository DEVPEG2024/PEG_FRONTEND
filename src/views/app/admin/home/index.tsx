import { Container, DoubleSidedImage } from '@/components/shared';
import { RootState } from '@/store';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

const Home = () => {
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.auth.user);
  return (
    <Container className="h-full">
      <div className="h-full flex flex-col items-center justify-center">
        <Suspense fallback={<></>}>
          <div className="text-center">
            <DoubleSidedImage
              className="mx-auto mb-8"
              src="/img/others/welcome.png"
              darkModeSrc="/img/others/welcome-dark.png"
              alt="Welcome"
            />

            <h3 className="mb-2">
              {t('hello')}, {user?.firstName} 👋
            </h3>
            <p className="text-base">{t('welcome_to_product_management')}</p>
          </div>
        </Suspense>
      </div>
    </Container>
  );
};

export default Home;
