import Dropdown from '@/components/ui/Dropdown';
import {
  HiExclamationCircle,
  HiOutlineTrash,
} from 'react-icons/hi';
import EllipsisButton from '@/components/shared/EllipsisButton';
import { TbPigMoney } from 'react-icons/tb';
import { useState } from 'react';
import { Button, Dialog } from '@/components/ui';
import { Project } from '@/@types/project';

const ProjectItemDropdown = ({
  handleDeleteProject,
  project,
  setIsPayProducerOpen,
}: {
  handleDeleteProject: (project: Project) => void;
  project: Project;
  setIsPayProducerOpen: (value: boolean) => void;
}) => {
  const [isValidDeleteOpen, setIsValidDeleteOpen] = useState(false);
  const dropdownList = [
    {
      label: 'Supprimer',
      value: 'delete',
      icon: <HiOutlineTrash />,
      action: () => handleDelete(),
      condition: () => true,
    },
    {
      label: 'Payer le producteur',
      value: 'payProducer',
      icon: <TbPigMoney />,
      action: () => setIsPayProducerOpen(true),
      condition: (selectedProject: Project) => selectedProject.producer,
    },
  ];
  const handleDelete = () => {
    setIsValidDeleteOpen(true);
  };
  const handleConfirmDelete = () => {
    handleDeleteProject(project);
    setIsValidDeleteOpen(false);
  };
  return (
    <>
      <Dropdown placement="bottom-end" renderTitle={<EllipsisButton />}>
        {dropdownList.filter((dropdownItem) => dropdownItem.condition(project)).map((item) => (
          <Dropdown.Item
            key={item.value}
            eventKey={item.value}
            onClick={() => item.action()}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="ml-2 rtl:mr-2">{item.label}</span>
          </Dropdown.Item>
        ))}
      </Dropdown>
      <Dialog isOpen={isValidDeleteOpen} onClose={() => setIsValidDeleteOpen(false)}>
        <div className="flex flex-col items-center justify-center">
          <HiExclamationCircle className="text-7xl text-red-500" />
          <h1 className="text-2xl font-bold mt-4">Suppression du projet</h1>
        </div>
        <div className="flex flex-col items-center justify-center">
          <p>Voulez-vous vraiment supprimer ce projet ?</p>
        </div>
        <div className="flex flex-grow items-center justify-center gap-2 mt-10">
          <Button onClick={() => setIsValidDeleteOpen(false)}>Annuler</Button>
          <Button
            onClick={handleConfirmDelete}
            className="bg-red-500 text-white"
            variant="solid"
          >
            Supprimer
          </Button>
        </div>
      </Dialog>
    </>
  );
};

export default ProjectItemDropdown;
