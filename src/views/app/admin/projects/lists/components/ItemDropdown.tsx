import Dropdown from '@/components/ui/Dropdown';
import {
  HiExclamationCircle,
  HiOutlinePencil,
  HiOutlineTrash,
} from 'react-icons/hi';
import EllipsisButton from '@/components/shared/EllipsisButton';
import { TbPigMoney } from 'react-icons/tb';
import { useState } from 'react';
import { Button, Dialog } from '@/components/ui';
import { useAppDispatch } from '@/store';
import { setEditProjectDialog, setSelectedProject } from '../../store';
import { Project } from '@/@types/project';

const ItemDropdown = ({
  handleDeleteProject,
  data,
  setIsPayProducerOpen,
}: {
  handleDeleteProject: (id: string) => void;
  data: Project;
  setIsPayProducerOpen: (value: boolean) => void;
}) => {
  const [validDelete, setValidDelete] = useState(false);
  const dispatch = useAppDispatch();
  const dropdownList = [
    {
      label: 'Modifier',
      value: 'edit',
      icon: <HiOutlinePencil />,
      action: () => handleEditProject(),
    },
    {
      label: 'Supprimer',
      value: 'delete',
      icon: <HiOutlineTrash />,
      action: () => handleDelete(),
    },
    {
      label: 'Payer le producteur',
      value: 'payProducer',
      icon: <TbPigMoney />,
      action: () => setIsPayProducerOpen(true),
    },
  ];
  const handleDelete = () => {
    setValidDelete(true);
  };
  const handleConfirmDelete = () => {
    handleDeleteProject(data._id);
    setValidDelete(false);
  };
  const handleEditProject = () => {
    dispatch(setSelectedProject(data));
    dispatch(setEditProjectDialog(true));
  };
  return (
    <>
      <Dropdown placement="bottom-end" renderTitle={<EllipsisButton />}>
        {dropdownList.map((item) => (
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
      <Dialog isOpen={validDelete} onClose={() => setValidDelete(false)}>
        <div className="flex flex-col items-center justify-center">
          <HiExclamationCircle className="text-7xl text-red-500" />
          <h1 className="text-2xl font-bold mt-4">Suppression du projet</h1>
        </div>
        <div className="flex flex-col items-center justify-center">
          <p>Voulez-vous vraiment supprimer ce projet ?</p>
        </div>
        <div className="flex flex-grow items-center justify-center gap-2 mt-10">
          <Button onClick={() => setValidDelete(false)}>Annuler</Button>
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

export default ItemDropdown;
