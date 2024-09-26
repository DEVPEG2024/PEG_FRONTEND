import { Container, DoubleSidedImage } from "@/components/shared";
import { Button, Card, Steps, Tag } from "@/components/ui";
import { RootState } from "@/store";
import { Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next"
import { useSelector } from "react-redux";
import { apiGetHomeProducer } from "@/services/HomeProducerService";
import { IProject } from "@/@types/project";
import ProjectListContent from "../projects/lists/components/ProjectListContent";
import GridItem from "../projects/lists/components/GridItem";

const Home = () => {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<IProject[]>([])
  const [level, setLevel] = useState<number>(0)
  const [wallet, setWallet] = useState<number>(0)
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    fetchHomeProducer()
  }, [])

  const fetchHomeProducer = async () => {
    const res = await apiGetHomeProducer(user?._id || '')
    setProjects(res.data.projects)
    setLevel(res.data.level)
    setWallet(res.data.wallet.balance)
  }
  
  return (
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
                {t("hello")}, {user?.firstName} 👋
              </h3>
              <p className="text-base">{t("welcome_to_product_management")}</p>
            </div>
          </div>
          <div className="lg:flex hidden">
            <Steps
              current={level}
              className="lg:flex grid grid-cols-4 justify-center gap-8"
            >
              <Steps.Item
                title="Cosmonaute Apprenti"
                image={"/img/others/level/0.png"}
                className="col-span-1 gap-8 w-1/4"
              />
              <Steps.Item
                title="Voyageur Interstellaire"
                image={"/img/others/level/1.png"}
                className="col-span-1 gap-8 w-1/4"
              />
              <Steps.Item
                title="Capitaine d’Exploration"
                image={"/img/others/level/2.png"}
                className="col-span-1 gap-8 w-1/4"
              />
              <Steps.Item
                title="Légende Galactique"
                image={"/img/others/level/3.png"}
                className="col-span-1 gap-8 w-1/4"
              />
            </Steps>
          </div>
        </div>
        <Container className="mt-4 lg:p-0 p-4">
          <div className="flex flex-col gap-4">
            <h3>Mes projets en cours</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
              {projects.map((project) => (
                <GridItem key={project._id} data={project} />
              ))}
              <Card className="gap-4">
                <div className="flex justify-between">
                  <div className="flex flex-col">
                    <h3>Mon portefeuille</h3>
                  </div>
                  <Tag className="bg-emerald-500 text-white">{wallet} €</Tag>
                </div>
                <div className="flex flex-col gap-2 justify-end mt-4"> 
                  <Button variant="twoTone" size="xs" className="w-full" color="red" >Retirer les fonds</Button>
                  <Button variant="twoTone" size="xs" className="w-full" color="green" >Voir les détails</Button>
                </div>
              </Card>
            </div>
          </div>
        </Container>
      </Suspense>
    </div>
  );
}

export default Home
