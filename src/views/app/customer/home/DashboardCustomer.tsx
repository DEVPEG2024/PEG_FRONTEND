import { Container, DoubleSidedImage } from '@/components/shared';
import { Button, Steps } from '@/components/ui';
import { RootState, injectReducer, useAppDispatch } from '@/store';
import { Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import HomeProductsList from './HomeProductsList';
import { BsArrowRight } from 'react-icons/bs';
import { Link } from 'react-router-dom';
import { User } from '@/@types/user';
import reducer, { getDashboardCustomerInformations, useAppSelector } from './store';

injectReducer('dashboardCustomer', reducer);

const DashboardCustomer = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch()
  const { customer, products } = useAppSelector((state) => state.dashboardCustomer.data);
  const {user}: {user: User} = useSelector((state: RootState) => state.auth.user!);

  useEffect(() => {
    fetchHomeCustomer();
  }, []);

  const fetchHomeCustomer = async () => {
    dispatch(getDashboardCustomerInformations(user.customer!.documentId))
  };

  return customer && (
    <div>
      <Suspense fallback={<></>}>
        {customer.banner && (
          <img
            src={customer.banner.image.url}
            alt="Banner"
            className="w-full object-cover"
          />
        )}
        <div className="flex bg-gray-900 justify-between p-4">
          <div className="flex gap-4 items-center">
            <DoubleSidedImage
              className="mx-auto h-36"
              src="/img/others/welcome.png"
              darkModeSrc="/img/others/welcome-dark.png"
              alt="Welcome"
            />
            <div className="flex flex-col">
              <h3 className="mb-1">
                {t('hello')}, {user?.firstName} 👋
              </h3>
              <p className="text-base">{t('welcome_to_product_management')}</p>
            </div>
          </div>
        </div>
        <Container className="mt-4 lg:p-0 p-4">
          <div className="flex flex-col gap-4">
            <h3>Mes offres personnalisées</h3>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <HomeProductsList products={products} />
              <div className="col-span-1 flex flex-col gap-4">
                <Link to="/customer/products">
                  <Button className="flex items-center justify-center gap-2">
                    <span>Voir toutes mes offres</span>
                    <BsArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/customer/catalogue">
                  <Button
                    variant="twoTone"
                    className="flex items-center justify-center gap-2"
                  >
                    <span>Voir le catalogue</span>
                    <BsArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </Suspense>
    </div>
  );
};

export default DashboardCustomer;
