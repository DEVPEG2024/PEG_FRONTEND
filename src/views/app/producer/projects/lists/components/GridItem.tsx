import Card from '@/components/ui/Card';
import ItemDropdown from './ItemDropdown';
import AvatarName from './AvatarName';
import ProgressionBar from './ProgressionBar';
import { Link, useNavigate } from 'react-router-dom';
import { IProject } from '@/@types/project';
import { LiaBusinessTimeSolid } from 'react-icons/lia';
import { MdAccessTime } from 'react-icons/md';

import dayjs from 'dayjs';
import { Tag } from '@/components/ui';
import { statusColorData, statusTextData } from '../constants';
import { useAppDispatch } from '@/store';
import { setSelectedProject } from '../../store';
import { useState } from 'react';
import PayProducerModal from '../../modals/payProducer';

const GridItem = ({ data }: { data: IProject }) => {
  const navigate = useNavigate();
  const [isPayProducerOpen, setIsPayProducerOpen] = useState(false);
  const dispatch = useAppDispatch();
  const { title, status, customer, startDate, endDate, tasks } = data;
  const duration = dayjs(endDate).diff(startDate, 'day');
  const statusColor = statusColorData[status as keyof typeof statusColorData];
  const statusText = statusTextData[status as keyof typeof statusTextData];
  const handleNavigateDetails = () => {
    dispatch(setSelectedProject(data));
    navigate(`/producer/projects/details/${data._id}`);
  };

  const completedTasksCount = tasks.filter(
    (task) => task.status === 'completed'
  ).length;

  const totalProgress =
    tasks.length > 0 ? completedTasksCount / tasks.length : 0;
  const percentageComplete = (totalProgress * 100).toFixed(0);
  return (
    <Card bodyClass="h-full bg-gray-900 rounded-lg project-card">
      <div className="flex flex-col justify-between h-full">
        <div className="flex justify-between">
          <a onClick={handleNavigateDetails} className="cursor-pointer">
            <h6 className="flex flex-grow items-center gap-2">
              <LiaBusinessTimeSolid className="text-2xl" />
              {title}
            </h6>
          </a>
          <div className={`flex items-center gap-4`}>
            <div className="flex items-center gap-2">
              <Tag className={`${statusColor} text-white`}>{statusText}</Tag>
            </div>
          </div>
        </div>
        <div className="mt-3 cursor-pointer" onClick={handleNavigateDetails}>
          <ProgressionBar progression={Number(percentageComplete)} />
          <div className="flex items-center justify-between mt-2">
            <AvatarName user={customer} />
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
      <PayProducerModal
        project={data}
        isPayProducerOpen={isPayProducerOpen}
        onClosePayProducer={() => setIsPayProducerOpen(false)}
      />
    </Card>
  );
};

export default GridItem;
