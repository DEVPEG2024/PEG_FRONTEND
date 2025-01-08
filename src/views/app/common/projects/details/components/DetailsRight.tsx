import Avatar from '@/components/ui/Avatar';
import AdaptableCard from '@/components/shared/AdaptableCard';
import IconText from '@/components/shared/IconText';
import {
  HiClock,
  HiCalendar,
  HiUserCircle,
  HiLightningBolt,
  HiExclamationCircle,
} from 'react-icons/hi';
import dayjs from 'dayjs';
import {
  priorityColorText,
  statusColorText,
  statusTextData,
} from '../../lists/constants';
import {
  LuCalendarCheck,
  LuCalendarClock,
} from 'react-icons/lu';
import { FaEuroSign } from 'react-icons/fa';
import { useAppSelector as useRootAppSelector, RootState, useAppDispatch } from '@/store';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, PRODUCER, SUPER_ADMIN } from '@/constants/roles.constant';
import { updateCurrentProject, useAppSelector } from '../store';
import { Button, Dialog } from '@/components/ui';
import { MdPersonAdd, MdPersonRemove } from 'react-icons/md';
import { useState } from 'react';

const DetailsRight = () => {
  const dispatch = useAppDispatch();
  const {project} = useAppSelector((state) => state.projectDetails.data);
  const {user}: {user: User} = useRootAppSelector((state: RootState) => state.auth.user);
  const [isValidUnassignMeOpen, setIsValidUnassignMeOpen] = useState(false);
  const status = statusTextData[project.state as keyof typeof statusTextData];
  const statusColor =
    statusColorText[project.state as keyof typeof statusColorText];
  const priorityColor =
    priorityColorText[project.priority as keyof typeof priorityColorText];
  const duration = dayjs(project.endDate).diff(project.startDate, 'day');
  const durationText =
    duration > 0 ? `${duration} jours restant` : 'Délais dépassé';
  const priority =
    project.priority === 'low'
      ? 'faible'
      : project.priority === 'medium'
        ? 'moyenne'
        : 'haute';

  const handleUnassignMe = () => {
    setIsValidUnassignMeOpen(true);
  };

  const handleConfirmUnassignMe = () => {
    unassignMeAsProducer();
    setIsValidUnassignMeOpen(false);
  };

  const assignMeAsProducer = () => {
    dispatch(updateCurrentProject({documentId: project.documentId, producer: user.producer!.documentId}))
  }

  const unassignMeAsProducer = () => {
    dispatch(updateCurrentProject({documentId: project.documentId, producer: null}))
  }

  return (
    <div>
      <AdaptableCard bodyClass="p-5">
        <h4 className="mb-6">Détails</h4>
        <IconText
          className={`mb-4 ${statusColor}`}
          icon={<HiClock className="text-lg" />}
        >
          <span className="font-semibold">{status}</span>
        </IconText>
        <IconText
          className="mb-4"
          icon={<HiCalendar className="text-lg opacity-70" />}
        >
          <span className="font-semibold">{durationText}</span>
        </IconText>
        {/*<IconText
          className="mb-4"
          icon={<IoFileTrayFull className="text-lg opacity-70" />}
        >
          <span className="font-semibold">{project.files.length} fichiers</span>
        </IconText>*/}
        {hasRole(user, [SUPER_ADMIN, ADMIN]) && (
          <IconText
          className="mb-4"
          icon={<FaEuroSign className="text-lg opacity-70" />}
          >
            <span className="font-semibold">
              Montant total : {project.price.toFixed(2)} €
            </span>
          </IconText>
        )}
        <IconText
          className={`mb-4 ${priorityColor}`}
          icon={<HiLightningBolt className="text-lg opacity-70" />}
        >
          <span className="font-semibold">Priorité {priority}</span>
        </IconText>
        <IconText
          className="mb-4"
          icon={<LuCalendarCheck className="text-lg opacity-70" />}
        >
          <span className="font-semibold">
            Démarre {dayjs(project.startDate).format('DD/MM/YYYY')}
          </span>
        </IconText>
        <IconText
          className="mb-4"
          icon={<LuCalendarClock className="text-lg opacity-70" />}
        >
          <span className="font-semibold">
            Fini le {dayjs(project.endDate).format('DD/MM/YYYY')}
          </span>
        </IconText>
        <hr className="my-6" />
        <p className="font-semibold mb-4">Client</p>
        <IconText
          key={project.customer?.documentId}
          className="mb-4"
          icon={<Avatar size={20} shape="circle" icon={<HiUserCircle />} />}
        >
          <span className="font-semibold text-gray-700 dark:text-gray-100">
            {project.customer?.name}
          </span>
        </IconText>
        {hasRole(user, [SUPER_ADMIN, ADMIN, PRODUCER]) && (
          <div>
            <hr className="my-6" />
            <p className="font-semibold mb-4">Producteur</p>
            {project.producer ? (
              <div className='flex space-x-5 items-center'>
                <IconText
                  key={project.producer.documentId}
                  className="mb-4"
                  icon={<Avatar size={20} shape="circle" icon={<HiUserCircle />} />}
                >
                  <span className="font-semibold text-gray-700 dark:text-gray-100">
                    {project.producer.name}
                  </span>
                </IconText>
                {hasRole(user, [PRODUCER]) && project.producer.documentId === user.producer!.documentId && (
                  <Button
                    variant="solid"
                    className="text-sm"
                    icon={<MdPersonRemove />}
                    onClick={handleUnassignMe}
                  >
                    <span>Me désassigner</span>
                  </Button>
                )}
              </div>
            ) : (
              <div className='flex space-x-5 items-center'>
                <span className="font-semibold text-gray-700 dark:text-gray-100">
                  A définir
                </span>
                {hasRole(user, [PRODUCER]) && (
                  <Button
                    variant="solid"
                    className="text-sm"
                    icon={<MdPersonAdd />}
                    onClick={assignMeAsProducer}
                  >
                    <span>M'assigner</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </AdaptableCard>
      <Dialog isOpen={isValidUnassignMeOpen} onClose={() => setIsValidUnassignMeOpen(false)}>
        <div className="flex flex-col items-center justify-center">
          <HiExclamationCircle className="text-7xl text-red-500" />
          <h1 className="text-2xl font-bold mt-4">Désassignement du projet</h1>
        </div>
        <div className="flex flex-col items-center justify-center">
          <p>Voulez-vous vraiment vous désassignez de ce projet ?</p>
        </div>
        <div className="flex flex-grow items-center justify-center gap-2 mt-10">
          <Button onClick={() => setIsValidUnassignMeOpen(false)}>Annuler</Button>
          <Button
            onClick={handleConfirmUnassignMe}
            className="bg-red-500 text-white"
            variant="solid"
          >
            Me désassigner
          </Button>
        </div>
      </Dialog>
    </div>
  );
};

export default DetailsRight;
