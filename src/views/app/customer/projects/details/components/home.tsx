import { useEffect, useState } from 'react';
import AdaptableCard from '@/components/shared/AdaptableCard';
import Loading from '@/components/shared/Loading';
import Container from '@/components/shared/Container';
import ReactHtmlParser from 'html-react-parser';
import { IProject } from '@/@types/project';
import DetailsRight from './detailsRight';
import { Progress } from '@/components/ui';
import OrderDetails from './orderDetails';
const CircleCustomInfo = ({ percent }: { percent: number }) => {
  return (
    <div className="text-center">
      <h3>{percent}%</h3>
      <span>Tâches terminées</span>
    </div>
  );
};
const Home = ({ project }: { project: IProject }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, [project]);

  const completedTasksCount = project.tasks.filter(
    (task) => task.status === 'completed'
  ).length;
  const totalProgress =
    project.tasks.length > 0 ? completedTasksCount / project.tasks.length : 0;
  const percentageComplete = (totalProgress * 100).toFixed(0);
  return (
    <Container className="h-full">
      <Loading loading={loading}>
        <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <AdaptableCard rightSideBorder bodyClass="p-5">
              <div className="flex flex-col md:flex-row md:items-center gap-8">
                <div className="flex items-center gap-4">
                  <Progress
                    variant="circle"
                    percent={Number(percentageComplete)}
                    width={150}
                    customInfo={
                      <CircleCustomInfo percent={Number(percentageComplete)} />
                    }
                  />
                </div>
                <div>
                  <h3 className="mb-2 font-bold">{project.title}</h3>
                  <p className="text-sm text-gray-400">{project.description}</p>
                </div>
              </div>
              <hr className="my-6" />
              {project.order ? (
                <div className="flex items-center justify-between mb-4">
                  <OrderDetails order={project.order} />
                </div>
              ) : (
                <div className="text-base">
                  <div className="flex items-center justify-between mb-4">
                    <h4>Description détaillée :</h4>
                  </div>
                  <div className="prose dark:prose-invert max-w-none text-sm">
                    {ReactHtmlParser(project.fullDescription || '')}
                  </div>
                </div>
              )}
            </AdaptableCard>
          </div>
          <DetailsRight project={project} />
        </div>
      </Loading>
    </Container>
  );
};

export default Home;
