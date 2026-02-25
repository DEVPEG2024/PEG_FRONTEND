import AdaptableCard from '@/components/shared/AdaptableCard';
import Container from '@/components/shared/Container';
import { Task } from '@/@types/project';
import DetailsRight from './DetailsRight';
import Empty from '@/components/shared/Empty';
import { GoTasklist } from 'react-icons/go';
import { Loading } from '@/components/shared';
import ModalEditTask from '../modals/ModalEditTask';
import { useAppSelector } from '../store';
import TaskCard from './TaskCard';

const Tasks = () => {
  const { tasks, selectedTask, loading } = useAppSelector(
    (state) => state.projectDetails.data
  );

  return (
    <Container className="h-full mt-4">
      <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <AdaptableCard bordered={false} bodyClass="p-5">
            <Loading loading={loading}>
              <div className="flex flex-col gap-2">
                {tasks.length > 0 ? (
                  tasks.map((task: Task, index: number) => (
                    <TaskCard
                      key={task.documentId}
                      task={task}
                      index={index}
                      loading={loading}
                    />
                  ))
                ) : (
                  <div className="flex flex-col gap-2 justify-center items-center">
                    <Empty icon={<GoTasklist size={150} />}>
                      <p>Aucune tâche trouvée</p>
                    </Empty>
                  </div>
                )}
              </div>
            </Loading>
          </AdaptableCard>
        </div>
        <DetailsRight />
      </div>
      {selectedTask && <ModalEditTask />}
    </Container>
  );
};

export default Tasks;
