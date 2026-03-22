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
    <Container className="h-full">
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', paddingTop: '28px', paddingBottom: '28px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{
          background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
          borderRadius: '18px',
          padding: '24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
        }}>
          <Loading loading={loading}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                  <Empty icon={<GoTasklist size={80} style={{ color: 'rgba(255,255,255,0.12)' }} />}>
                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', marginTop: '12px' }}>Aucune tâche trouvée</p>
                  </Empty>
                </div>
              )}
            </div>
          </Loading>
        </div>
        <DetailsRight />
      </div>
      {selectedTask && <ModalEditTask />}
    </Container>
  );
};

export default Tasks;
