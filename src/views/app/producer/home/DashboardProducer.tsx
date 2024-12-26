import { Container, DoubleSidedImage } from '@/components/shared';
import { Button, Card, Tag } from '@/components/ui';
import { RootState, injectReducer, useAppDispatch } from '@/store';
import { Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Project } from '@/@types/project';
import ProjectItem from '../../common/projects/lists/components/ProjectItem';
import { User } from '@/@types/user';
import reducer, { getDashboardProducerInformations, useAppSelector } from './store';

injectReducer('dashboardProducer', reducer);

const DashboardProducer = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch()
  const { producer } = useAppSelector((state) => state.dashboardProducer.data);
  const [wallet, setWallet] = useState<number>(0);
  const {user}: {user: User} = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    fetchHomeProducer();
  }, []);

  const fetchHomeProducer = async () => {
    dispatch(getDashboardProducerInformations(user.producer!.documentId))
  };

  return producer && (
    <div>
      <Suspense fallback={<></>}>
        <img
          src="/img/others/peg_producer.jpg"
          alt="Banner"
          className="w-full object-cover"
        />

        <div className="flex bg-gray-900 justify-between items-center p-4 ">
          <div className=" flex  items-center gap-4">
            <DoubleSidedImage
              className="mx-auto h-36 "
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
              {producer.projects.length > 0 && (
                <div>
                  <h3 className="mb-2">Mes projets en cours</h3>
                  {producer.projects.map((project: Project) => (
                    <ProjectItem key={project.documentId} project={project} />
                  ))}
                </div>
              )}
            </div>
            <Card className="gap-4 w-1/4">
              <div className="flex justify-between">
                <div className="flex flex-col">
                  <h3>Mon portefeuille</h3>
                </div>
                <Tag className="bg-emerald-500 text-white">{wallet} €</Tag>
              </div>
              <div className="flex flex-col gap-2 justify-end mt-4">
                <Button
                  variant="twoTone"
                  size="xs"
                  className="w-full"
                  color="red"
                >
                  Retirer les fonds
                </Button>
                <Button
                  variant="twoTone"
                  size="xs"
                  className="w-full"
                  color="green"
                >
                  Voir les détails
                </Button>
              </div>
            </Card>
          </div>
        </Container>
      </Suspense>
    </div>
  );
};

export default DashboardProducer;
