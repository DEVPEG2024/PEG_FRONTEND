import Button from '@/components/ui/Button';
import { useDispatch } from 'react-redux';
import { HiOutlinePlusCircle } from 'react-icons/hi';
import { setNewDialogTask } from '../../store';

const BoardAddNewTask = () => {
  const dispatch = useDispatch();

  const onAddTask = () => {
    dispatch(setNewDialogTask(true));
  };

  return (
    <Button
      size="sm"
      icon={<HiOutlinePlusCircle />}
      onClick={onAddTask}
      variant="twoTone"
    >
      <span>Ajouter une tâche</span>
    </Button>
  );
};

export default BoardAddNewTask;
