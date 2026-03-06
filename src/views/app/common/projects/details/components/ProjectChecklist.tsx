import AdaptableCard from '@/components/shared/AdaptableCard';
import Container from '@/components/shared/Container';
import { ChecklistItem } from '@/@types/checklist';
import { RootState } from '@/store';
import { useAppSelector as useRootAppSelector } from '@/store';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN, PRODUCER } from '@/constants/roles.constant';
import { updateCurrentProject, useAppDispatch, useAppSelector } from '../store';
import Empty from '@/components/shared/Empty';
import { MdChecklist } from 'react-icons/md';
import DetailsRight from './DetailsRight';

const ProjectChecklist = () => {
  const dispatch = useAppDispatch();
  const { project } = useAppSelector((state) => state.projectDetails.data);
  const { user }: { user: User } = useRootAppSelector(
    (state: RootState) => state.auth.user
  );

  const canToggle = hasRole(user, [SUPER_ADMIN, ADMIN, PRODUCER]);
  const items: ChecklistItem[] = project?.checklistItems ?? [];
  const doneCount = items.filter((i) => i.done).length;

  const toggleItem = (index: number) => {
    if (!canToggle || !project) return;
    const updated = items.map((item, i) =>
      i === index ? { ...item, done: !item.done } : item
    );
    dispatch(
      updateCurrentProject({
        documentId: project.documentId,
        checklistItems: updated,
      })
    );
  };

  return (
    <Container className="h-full mt-4">
      <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <AdaptableCard bordered={false} bodyClass="p-5">
            <div className="flex items-center justify-between mb-4">
              <h5 className="mb-0">Checklist du projet</h5>
              {items.length > 0 && (
                <span className="text-sm text-gray-400">
                  {doneCount} / {items.length} tâche{items.length > 1 ? 's' : ''} effectuée{doneCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {items.length > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.round((doneCount / items.length) * 100)}%` }}
                />
              </div>
            )}

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Empty icon={<MdChecklist size={150} />}>
                  <p>Aucune checklist associée à ce projet</p>
                  {canToggle && (
                    <p className="text-sm text-gray-400 mt-1">
                      Associez un modèle de checklist au produit lors de la création du projet
                    </p>
                  )}
                </Empty>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      item.done
                        ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                        : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                    } ${canToggle ? 'cursor-pointer hover:opacity-80' : ''}`}
                    onClick={() => toggleItem(index)}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        item.done
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-400 bg-white dark:bg-gray-700'
                      }`}
                    >
                      {item.done && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        item.done ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {item.label}
                    </span>
                    {!canToggle && (
                      <span className="ml-auto text-xs text-gray-400">
                        {item.done ? 'Effectuée' : 'En attente'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!canToggle && items.length > 0 && (
              <p className="text-xs text-gray-400 mt-4 text-center">
                Seuls les administrateurs et producteurs peuvent modifier la checklist
              </p>
            )}
          </AdaptableCard>
        </div>
        <DetailsRight />
      </div>
    </Container>
  );
};

export default ProjectChecklist;
