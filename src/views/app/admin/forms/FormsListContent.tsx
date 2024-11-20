import HeaderTitle from '@/components/template/HeaderTitle';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, {
  deleteForm,
  getForms,
  setForm,
  setNewFormDialog,
  useAppSelector,
} from './store';
import { useEffect } from 'react';
import { Button, Card } from '@/components/ui';
import { useNavigate } from 'react-router-dom';
import { Form } from '@/@types/form';
import { HiPencil, HiTrash } from 'react-icons/hi';
import { TbForms } from 'react-icons/tb';

injectReducer('forms', reducer);

function FormsListContent() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { forms, total } = useAppSelector((state) => state.forms.data);
  useEffect(() => {
    dispatch(getForms({ pagination: {page: 1, pageSize: 10}, searchTerm: '' }));
  }, []);
  const handleEdit = (form: Form) => {
    dispatch(setForm(form));
    navigate(`/admin/forms/edit/${form.documentId}`);
  };
  const handleDelete = (documentId: string) => {
    dispatch(deleteForm(documentId));
  };
  const setIsOpenNewForm = () => {
    dispatch(setNewFormDialog(true));
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
                <Button
                  variant="plain"
                  size="sm"
                  onClick={() => handleEdit(form)}
                  icon={<HiPencil />}
                />
                <Button
                  variant="twoTone"
                  size="sm"
                  onClick={() => handleDelete(form.documentId)}
                  icon={<HiTrash />}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default FormsListContent;
