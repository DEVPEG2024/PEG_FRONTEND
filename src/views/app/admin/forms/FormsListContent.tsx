import HeaderTitle from '@/components/template/HeaderTitle';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, {
  deleteForm,
  duplicateForm,
  getForms,
  setForm,
  setNewFormDialog,
  useAppSelector,
} from './store';
import { useEffect } from 'react';
import { Button, Card, Notification, toast, Tooltip } from '@/components/ui';
import { Form } from '@/@types/form';
import { HiDuplicate, HiPencil, HiTrash } from 'react-icons/hi';
import { TbForms } from 'react-icons/tb';
import { Loading } from '@/components/shared';

injectReducer('forms', reducer);

function FormsListContent() {
  const dispatch = useAppDispatch();
  const { forms, total, loading } = useAppSelector((state) => state.forms.data);
  useEffect(() => {
    dispatch(
      getForms({ pagination: { page: 1, pageSize: 10 }, searchTerm: '' })
    );
  }, []);
  
  const handleEdit = (form: Form) => {
    dispatch(setForm(form));
    setIsOpenNewForm();
  };
  
  const handleDelete = (documentId: string) => {
    dispatch(deleteForm(documentId));
  };
  
  const setIsOpenNewForm = () => {
    dispatch(setNewFormDialog(true));
  };

  const handleDuplicate = (form: Form) => {
    dispatch(duplicateForm(form));
    toast.push(
      <Notification type="success" title="Dupliqué">
        Formulaire dupliqué avec succès
      </Notification>
    );
  };
  return (
    <div className="h-full">
      <HeaderTitle
        title="Formulaires"
        buttonTitle="Créer"
        description="Tous les formulaires"
        link={''}
        addAction={true}
        action={setIsOpenNewForm}
        total={total}
      />
      <Loading loading={loading}>
        <div className="flex flex-col gap-2 h-full mt-4">
          {forms.map((form) => (
            <Card key={form.documentId} className="bg-gray-900">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TbForms className="text-red-400 text-4xl" />
                  <div className="flex flex-col">
                    <span className="text-lg text-white font-bold">
                      {form.name}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip title="Modifier le formulaire">
                    <Button
                      variant="plain"
                      size="sm"
                      onClick={() => handleEdit(form)}
                      icon={<HiPencil />}
                    />
                  </Tooltip>
                  <Tooltip title="Dupliquer le formulaire">
                    <Button
                      variant="twoTone"
                      size="sm"
                      onClick={() => handleDuplicate(form)}
                      icon={<HiDuplicate />}
                    />
                  </Tooltip>
                  <Tooltip title="Supprimer le formulaire">
                    <Button
                      variant="twoTone"
                      size="sm"
                      onClick={() => handleDelete(form.documentId)}
                      icon={<HiTrash />}
                    />
                  </Tooltip>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Loading>
    </div>
  );
}

export default FormsListContent;
