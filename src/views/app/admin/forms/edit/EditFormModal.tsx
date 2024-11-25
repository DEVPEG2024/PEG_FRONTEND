import { Dialog } from '@/components/ui';
import {
  setForm,
  setNewFormDialog,
  updateForm,
  useAppDispatch,
  useAppSelector,
} from '../store';
import EditForm from './EditForm';
import { apiCreateForm } from '@/services/FormServices';
import { Form } from '@/@types/form';

function EditFormModal() {
  const { newFormDialog, form } = useAppSelector(
    (state) => state.forms.data
  );
  const dispatch = useAppDispatch();
  const handleClose = () => {
    dispatch(setNewFormDialog(false));
    dispatch(setForm(null));
  };

  const onValidate = (name: string, components: any) => {
    if (form?.documentId) {
      dispatch(updateForm({...form, name, fields: JSON.stringify(components)} as Form))
    } else {
      apiCreateForm({name, fields: JSON.stringify(components)})
    }
    handleClose()
  }

  return (
    <div>
      <Dialog isOpen={newFormDialog} onClose={handleClose} width={1200} contentClassName='dialog-formbuilder'>
        <EditForm onValidate={onValidate} onCancel={handleClose} fields={form?.fields ?? []} name={form?.name ?? ''}/>
      </Dialog>
    </div>
  );
}

export default EditFormModal;
