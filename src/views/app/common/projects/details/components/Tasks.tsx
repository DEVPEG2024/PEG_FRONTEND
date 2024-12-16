import Button from '@/components/ui/Button';
import AdaptableCard from '@/components/shared/AdaptableCard';
import Container from '@/components/shared/Container';
import { HiLightningBolt, HiPencil } from 'react-icons/hi';
import { Task } from '@/@types/project';
import DetailsRight from './DetailsRight';
import { User } from '@/@types/user';
import { RootState, useAppDispatch, useAppSelector as useRootAppSelector } from '@/store';
import ReactHtmlParser from 'html-react-parser';
import { Card, Checkbox } from '@/components/ui';
import Empty from '@/components/shared/Empty';
import { GoTasklist } from 'react-icons/go';
import { useState } from 'react';
import { IconText } from '@/components/shared';
import { priorityColorText } from '../../lists/constants';
import dayjs from 'dayjs';
import { FaAngleDown, FaAngleUp } from 'react-icons/fa';
import ModalEditTask from '../modals/ModalEditTask';
import { hasRole } from '@/utils/permissions';
import { SUPER_ADMIN } from '@/constants/roles.constant';
import { updateTask, setEditDialogTask, setSelectedTask, useAppSelector } from '../store';

const Tasks = () => {
  const {user}: {user: User} = useRootAppSelector((state: RootState) => state.auth.user);
  const {tasks, selectedTask, loading} = useAppSelector((state) => state.projectDetails.data);
  const dispatch = useAppDispatch();
  const [openTasks, setOpenTasks] = useState<{ [key: string]: boolean }>({});

  const handleChangeTaskState = async (documentId: string, state: string) => {
    dispatch(updateTask({documentId, state}))
  };

  const toggleTask = (taskId: string) => {
    setOpenTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleEditTask = (task: Task) => {
    dispatch(setSelectedTask(task));
    dispatch(setEditDialogTask(true));
  };

  return (
    <Container className="h-full">
      <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <AdaptableCard rightSideBorder bodyClass="p-5">
            <div className="flex justify-between items-center mb-4">
              <h4>Tâches</h4>
            </div>
            <div className="flex flex-col gap-2">
              {tasks.length > 0 ? (
                tasks.map((task: Task, index: number) => {
                  const priorityColor =
                    priorityColorText[
                      task.priority as keyof typeof priorityColorText
                    ];
                  const priority =
                    task.priority === 'low'
                      ? 'faible'
                      : task.priority === 'medium'
                        ? 'moyenne'
                        : 'haute';
                  const checked = task.state === 'fulfilled';
                  return (
                    <Card key={task.documentId} bordered className=" bg-gray-900">
                      <div className="grid grid-cols-12 justify-between">
                        <div
                          className="cursor-pointer col-span-6 "
                          onClick={() => toggleTask(task.documentId)}
                        >
                          <div className="flex justify-between w-full">
                            <div className="flex items-center gap-2 ">
                              {openTasks[task.documentId] ? (
                                <FaAngleUp
                                  size={20}
                                  className="text-gray-500"
                                />
                              ) : (
                                <FaAngleDown
                                  size={20}
                                  className="text-gray-500"
                                />
                              )}
                              <span className="text-sm text-gray-500">
                                #{index + 1} -{' '}
                              </span>
                              <span className="font-semibold">
                                {task.name}
                              </span>
                            </div>
                            <div className="cursor-pointer  items-center justify-end gap-2 hidden md:block">
                              <span className="text-sm text-gray-500">
                                A faire avant le{' '}
                                {dayjs(task.endDate).format('DD/MM/YYYY')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 col-span-6">
                          <IconText
                            className={`${priorityColor} col-span-6`}
                            icon={
                              <HiLightningBolt className="text-lg opacity-70" />
                            }
                          >
                            <span className="font-semibold hidden md:block">
                              Priorité {priority}
                            </span>
                          </IconText>
                          <Checkbox
                            className="col-span-6"
                            checked={checked}
                            disabled={loading || !hasRole(user, [SUPER_ADMIN])}
                            color="green-500"
                            onChange={() =>
                              handleChangeTaskState(
                                task.documentId,
                                task.state === 'fulfilled'
                                  ? 'pending'
                                  : 'fulfilled'
                              )
                            }
                          />
                        </div>
                      </div>
                      {openTasks[task.documentId] && (
                        <div className="flex flex-col gap-2 mt-8 px-4">
                          <hr className="my-6" />
                          <div className="flex justify-between ">
                            <div className="">
                              {ReactHtmlParser(task.description || '')}
                            </div>
                            <Button
                              variant="twoTone"
                              size="sm"
                              onClick={() => handleEditTask(task)}
                            >
                              <HiPencil size={20} />
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })
              ) : (
                <div className="flex flex-col gap-2 justify-center items-center">
                  <Empty icon={<GoTasklist size={150} />}>
                    <p>Aucune tâche trouvée</p>
                  </Empty>
                </div>
              )}
            </div>
          </AdaptableCard>
        </div>
        <DetailsRight />
      </div>
      {selectedTask && (<ModalEditTask />)}
    </Container>
  );
};

export default Tasks;
