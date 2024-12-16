import { useState } from 'react';
import AdaptableCard from '@/components/shared/AdaptableCard';
import Loading from '@/components/shared/Loading';
import Container from '@/components/shared/Container';
import ReactHtmlParser from 'html-react-parser';
import { Project } from '@/@types/project';
import DetailsRight from './DetailsRight';
import { Button, Progress } from '@/components/ui';
import OrderItemDetails from './OrderItemDetails';
import { debounce } from 'lodash';
import { HiPencil } from 'react-icons/hi';
import { RichTextEditor } from '@/components/shared';
import { User } from '@/@types/user';
import { RootState, useAppDispatch, useAppSelector as useRootAppSelector } from '@/store';
import { hasRole } from '@/utils/permissions';
import { SUPER_ADMIN } from '@/constants/roles.constant';
import { useAppSelector, updateProject, setEditDescription } from '../store';
const CircleCustomInfo = ({ percent }: { percent: number }) => {
  return (
    <div className="text-center">
      <h3>{percent}%</h3>
      <span>Tâches terminées</span>
    </div>
  );
};

const Summary = ({ project }: { project: Project }) => {
  const {user}: {user: User} = useRootAppSelector((state: RootState) => state.auth.user);
  const {loading, editDescription} = useAppSelector((state) => state.projectDetails.data);
  const dispatch = useAppDispatch();
  const [description, setDescription] = useState(project.description);

  const debounceFn = debounce(handleDebounceFn, 1000);

  function handleDebounceFn(val: string) {
    setDescription(val);
  }

  const onEditModeActive = () => {
    dispatch(setEditDescription(true));
  }
  
  const onEditComplete = () => {
    dispatch(updateProject({...project, description}))
  };

  const onEdit = (val: string) => {
    debounceFn(val);
  };

  const completedTasksCount = project.tasks.filter(
    (task) => task.state === 'fulfilled'
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
                  <OrderItemDetails orderItem={project.orderItem} customer={project.customer!} />
                </div>
              ) : (
                <div className="text-base">
                  <div className="flex items-center justify-between mb-4">
                    <h4>Description détaillée :</h4>
                    {/* TODO: A améliorer avec celui d'en-dessous*/}
                    {hasRole(user, [SUPER_ADMIN]) && (
                      <div>
                        {editDescription ? (
                          <Button
                            block
                            variant="solid"
                            onClick={onEditComplete}
                            loading={loading}
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
                    )}
                  </div>
                  {hasRole(user, [SUPER_ADMIN]) && editDescription ? (
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
          <DetailsRight />
        </div>
      </Loading>
    </Container>
  );
};

export default Summary;
