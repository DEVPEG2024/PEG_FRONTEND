import { Dialog } from '@/components/ui';

import {
  setNewFormDialog,
  useAppDispatch,
  useAppSelector,
} from '../store';
import CreateForm from './CreateForm';
import { apiCreateForm } from '@/services/FormServices';

function NewFormModal() {
  let components = {}
  const { newFormDialog } = useAppSelector(
    (state) => state.forms.data
  );
  const dispatch = useAppDispatch();
  const handleClose = () => {
    dispatch(setNewFormDialog(false));
  };

  const onFormBuilderChange = (e) => {
    components = e.components
  }

  const onValidate = () => {
    handleClose()
    apiCreateForm({name: 'Test', fields: JSON.stringify(components)})
  }

  return (
    <div>
      <Dialog isOpen={newFormDialog} onClose={handleClose} width={1200} contentClassName='dialog-formbuilder'>
        <CreateForm onFormBuilderChange={onFormBuilderChange} onValidate={onValidate}/>
      </Dialog>
    </div>
  );
}

export default NewFormModal;
