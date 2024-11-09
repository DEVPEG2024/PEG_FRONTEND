import { IProduct, Product } from '@/@types/product';
import { Container, DoubleSidedImage } from '@/components/shared';
import { Button, Steps } from '@/components/ui';
import { API_URL_IMAGE } from '@/configs/api.config';
import { apiGetCustomer, CustomerResponse } from '@/services/HomeCustomerService';
import { RootState } from '@/store';
import { Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import ProductsLists from '../components/ProductsLists';
import { BsArrowRight } from 'react-icons/bs';
import { Link } from 'react-router-dom';
import { apiGetCustomerProducts, CustomerProductsResponse } from '@/services/ProductServices';

const Home = () => {
  const { t } = useTranslation();
  const [banner, setBanner] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [level, setLevel] = useState<number>(0);
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    fetchHomeCustomer();
  }, []);

  const fetchHomeCustomer = async () => {
    const {data: customer} : {data: CustomerResponse} = await apiGetCustomer(user?.customer?.documentId);
    const {data: products} : {data: CustomerProductsResponse} = await apiGetCustomerProducts(customer?.documentId, customer.customer_category.documentId);
    setBanner(customer.banner?.image || '');
    setProducts(products.products);
    setLevel(0); // TODO: A supprimer
  };

  return (
    <div>
      <Suspense fallback={<></>}>
        {banner && (
          <img
            src={API_URL_IMAGE + banner}
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
          <div className="lg:flex hidden items-start">
            <Steps
              current={level}
              className="lg:flex grid grid-cols-4 justify-end gap-8 text-[8px]"
            >
              <Steps.Item
                title="Cosmonaute Apprenti"
                image={'/img/others/level/0.png'}
                className="col-span-1 gap-8"
              />
              <Steps.Item
                title="Voyageur Interstellaire"
                image={'/img/others/level/1.png'}
                className="col-span-1 gap-8"
              />
              <Steps.Item
                title="Capitaine d’Exploration"
                image={'/img/others/level/2.png'}
                className="col-span-1 gap-8"
              />
              <Steps.Item
                title="Légende Galactique"
                image={'/img/others/level/3.png'}
                className="col-span-1 gap-8"
              />
            </Steps>
          </div>
        </div>
        <Container className="mt-4 lg:p-0 p-4">
          <div className="flex flex-col gap-4">
            <h3>Mes offres personnalisées</h3>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <ProductsLists products={products} />
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

export default Home;
