import HeaderTitle from '@/components/template/HeaderTitle'
import { injectReducer, useAppDispatch } from '@/store'
import reducer, { deleteForm, getForms, setForm, useAppSelector } from './store'
import { useEffect } from 'react';
import { Button, Card } from '@/components/ui';
import { useNavigate } from 'react-router-dom';
import { IForm } from '@/@types/form';
import { MdEdit } from 'react-icons/md';
import { TbForms } from 'react-icons/tb';

injectReducer("forms", reducer);

function FormsBuilder() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { forms } = useAppSelector((state) => state.forms.data)
  useEffect(() => {
    dispatch(getForms({ page: 1, pageSize: 10, searchTerm: "" }))
  }, [])
  const handleEdit = (form: IForm) => {
    dispatch(setForm(form))
    navigate(`/admin/forms/edit/${form._id}`)
  }
  const handleDelete = (id: string) => {
    dispatch(deleteForm(id))
  }
  return (
    <div className="h-full">
      <HeaderTitle
        title="Formulaires"
        buttonTitle="Créer"
        description="Tous les formulaires"
        link={"/admin/forms/add"}
        addAction
        total={forms.length}
      />
      <div className="flex flex-col gap-2 h-full mt-4">
        {forms.map((form) => (
          <Card key={form._id} className="bg-gray-900">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <TbForms className="text-red-400 text-4xl" />
                <div className="flex flex-col">
                  <span className="text-lg text-white font-bold">{form.title}</span>
                  <span className="text-md text-white">{form.fields.length} champs</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="plain" size="sm" onClick={() => handleEdit(form)}>
                  <MdEdit />
                </Button>
                <Button variant="twoTone" size="sm" onClick={() => handleDelete(form._id)}>
                  Supprimer
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default FormsBuilder
