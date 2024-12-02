import { useEffect, useState, useCallback } from 'react';
import Button from '@/components/ui/Button';
import AdaptableCard from '@/components/shared/AdaptableCard';
import Loading from '@/components/shared/Loading';
import Container from '@/components/shared/Container';
import RichTextEditor from '@/components/shared/RichTextEditor';
import { HiInformationCircle, HiPencil } from 'react-icons/hi';
import ReactHtmlParser from 'html-react-parser';
import debounce from 'lodash/debounce';
import { Project } from '@/@types/project';
import { updateProject } from '@/utils/hooks/projects/useCreateProject';
import DetailsRight from './detailsRight';
import { Progress } from '@/components/ui';
import OrderItemDetails from './OrderItemDetails';
const CircleCustomInfo = ({ percent }: { percent: number }) => {
  return (
    <div className="text-center">
      <h3>{percent}%</h3>
      <span>Tâches terminées</span>
    </div>
  );
};
const Home = ({ project }: { project: Project }) => {
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [description, setDescription] = useState(project.description);
  const [isUpdating, setIsUpdating] = useState(false);

  const debounceFn = debounce(handleDebounceFn, 1000);

  function handleDebounceFn(val: string) {
    setDescription(val);
  }
  useEffect(() => {
    setLoading(false);
  }, [project]);

  const onEditModeActive = useCallback(() => {
    setEditMode(true);
  }, []);

  const onEditComplete = useCallback(async () => {
    setIsUpdating(true);
    try {
      await updateProject({
        ...project,
        fullDescription: description,
      });
      setEditMode(false);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du projet:', error);
      // Optionnel : ajouter une notification d'erreur pour l'utilisateur
    } finally {
      setIsUpdating(false);
    }
  }, [project, description]);

  const onEdit = (val: string) => {
    debounceFn(val);
  };

  const completedTasksCount = project.tasks.filter(
    (task) => task.state === 'completed'
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
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
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
                  <h3 className="mb-2 font-bold">{project.name}</h3>
                  <p className="text-sm text-gray-400">{project.description}</p>
                </div>
              </div>
              <hr className="my-6" />
              {project.orderItem ? (
                <div className="flex items-center justify-between mb-4">
                  <OrderItemDetails orderItem={project.orderItem} customer={project.customer} />
                </div>
              ) : (
                <div className="text-base">
                  <div className="flex items-center justify-between mb-4">
                    <h4>Description détaillée :</h4>
                    <div>
                      {editMode ? (
                        <Button
                          block
                          variant="solid"
                          onClick={onEditComplete}
                          loading={isUpdating}
                        >
                          Terminer
                        </Button>
                      ) : (
                        <Button
                          block
                          icon={<HiPencil />}
                          onClick={onEditModeActive}
                        >
                          Modifier
                        </Button>
                      )}
                    </div>
                  </div>
                  {editMode ? (
                    <RichTextEditor value={description} onChange={onEdit} />
                  ) : (
                    <div className="prose dark:prose-invert max-w-none text-sm">
                      {ReactHtmlParser(description || '')}
                    </div>
                  )}
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
