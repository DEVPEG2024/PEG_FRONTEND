import Card from '@/components/ui/Card';
import ProjectItemDropdown from './ProjectItemDropdown';
import AvatarName from './AvatarName';
import ProgressionBar from './ProgressionBar';
import { Link, useNavigate } from 'react-router-dom';
import { Project } from '@/@types/project';
import { LiaBusinessTimeSolid } from 'react-icons/lia';
import { MdAccessTime } from 'react-icons/md';

import dayjs from 'dayjs';
import { Tag } from '@/components/ui';
import { statusColorData, statusTextData } from '../constants';
import { RootState, useAppDispatch, useAppSelector } from '@/store';
import { useState } from 'react';
import ModalPayProducer from '../../modals/ModalPayProducer';
import { hasRole } from '@/utils/permissions';
import { CUSTOMER, PRODUCER, SUPER_ADMIN } from '@/constants/roles.constant';
import { User } from '@/@types/user';

const ProjectItem = ({
  project,
  handleDeleteProject,
}: {
  project: Project;
  handleDeleteProject?: (project: Project) => void;
}) => {
  const {user}: {user: User} = useAppSelector((state: RootState) => state.auth.user);
  const isSuperAdmin: boolean = hasRole(user, [SUPER_ADMIN])
  const navigate = useNavigate();
  const [isPayProducerOpen, setIsPayProducerOpen] = useState(false);
  const duration = dayjs(project.endDate).diff(project.startDate, 'day');
  const statusColor = statusColorData[project.state as keyof typeof statusColorData];
  const statusText = statusTextData[project.state as keyof typeof statusTextData];

  const handleNavigateDetails = () => {
    navigate(`/common/projects/details/${project.documentId}`);
  };

  const completedTasksCount = project.tasks.filter(
    (task) => task.state === 'fulfilled'
  ).length;

  const totalProgress =
  project.tasks.length > 0 ? completedTasksCount / project.tasks.length : 0;
  const percentageComplete = (totalProgress * 100).toFixed(0);
  return (
    <Card bodyClass="h-full bg-gray-900 rounded-lg project-card">
      <div className="flex flex-col justify-between h-full">
        <div className="flex justify-between">
          <a onClick={handleNavigateDetails} className="cursor-pointer">
            <h6 className="flex flex-grow items-center gap-2">
              <LiaBusinessTimeSolid className="text-2xl" />
              {project.name}
            </h6>
          </a>
          <div className={`flex items-center gap-4`}>
            <div className="flex items-center gap-2">
              <Tag className={`${statusColor} text-white`}>{statusText}</Tag>
            </div>
            {isSuperAdmin && (
              <ProjectItemDropdown
                project={project}
                handleDeleteProject={handleDeleteProject!}
                setIsPayProducerOpen={setIsPayProducerOpen}
              />
            )}
          </div>
        </div>
        {isSuperAdmin && (
          <p className="mt-4 cursor-pointer" onClick={handleNavigateDetails}>
          Total projet: {project.price} € - Total producteur: {project.producerPrice} €
        </p>
        )}
        {hasRole(user, [PRODUCER]) && (
          <p className="mt-4 cursor-pointer" onClick={handleNavigateDetails}>
          Total producteur: {project.producerPrice} €
        </p>
        )}
        {hasRole(user, [CUSTOMER]) && (
          <p className="mt-4 cursor-pointer" onClick={handleNavigateDetails}>
          Total projet: {project.price} €
        </p>
        )}
        <div className="mt-3 cursor-pointer" onClick={handleNavigateDetails}>
          <ProgressionBar progression={Number(percentageComplete)} />
          <div className="flex items-center justify-between mt-2">
            <AvatarName entity={project.customer} type="Client" />
            {hasRole(user, [SUPER_ADMIN, PRODUCER]) && (
              <AvatarName entity={project.producer} type="Producteur" />
            )}
            <div className="flex items-center rounded-full font-semibold text-xs">
              <div
                className={`flex items-center px-2 py-1 border-2 border-gray-300 rounded-full`}
              >
                <MdAccessTime className="text-white" size={16} />
                <span className="ml-1 rtl:mr-1 whitespace-nowrapn text-white">
                  {duration > 0 ? `${duration} jours restant` : 'Dépassé'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {isPayProducerOpen && (
        <ModalPayProducer
          project={project}
          isPayProducerOpen={isPayProducerOpen}
          onClosePayProducer={() => setIsPayProducerOpen(false)}/>
      )}
    </Card>
  );
};

export default ProjectItem;
