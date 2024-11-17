import FormFieldsList from '../builder/FormFieldsList';
import ConfigForms from '../builder/configForms';
import { Button, Card, Input, Notification, toast } from '@/components/ui';
import { FormFieldType, FormFieldTypes } from '../constants/type';
import { useState } from 'react';
import FieldConfig from '../builder/components/fieldsConfig';
import Empty from '@/components/shared/Empty';
import { RxInput } from 'react-icons/rx';
import { apiUpdateForm } from '@/services/FormServices';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../store';
import { FormField, IForm } from '@/@types/form';

function EditForm() {
  const { form } = useAppSelector((state) => state.forms.data);
  const [selectedFields, setSelectedFields] = useState<FormField[]>(
    form?.form_fields ?? []
  );
  const [currentField, setCurrentField] = useState<FormField | null>(null);
  const [formTitle, setFormTitle] = useState<string>(form?.name ?? '');
  const navigate = useNavigate();
  const handleFormFieldTypeSelected = (formFieldType: FormFieldType) => {
    const newField = { type: formFieldType.type, documentId: Date.now().toString(), options: {} };
    setCurrentField(newField);
  };

  const handleAddField = (field: FormField) => {
    setSelectedFields([...selectedFields, field]);
    setCurrentField(null);
  };

  const handleDeleteField = (formField: FormField) => {
    setSelectedFields(selectedFields.filter((field) => field.documentId !== formField.documentId));
  };

  const handleConfigChange = (config: Partial<FormFieldType>) => {
    if (currentField) {
      const updatedField = { ...currentField, ...config };
      setSelectedFields(
        selectedFields.map((field) =>
          field.id === currentField.id ? updatedField : field
        )
      );
      setCurrentField(updatedField);
    }
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === selectedFields.length - 1)
    ) {
      return; // Ne rien faire si on essaie de déplacer le premier élément vers le haut ou le dernier vers le bas
    }

    const newFields = [...selectedFields];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[newIndex]] = [
      newFields[newIndex],
      newFields[index],
    ];
    setSelectedFields(newFields);
  };

  const handleSaveForm = async () => {
    if (!formTitle) {
      toast.push(
        <Notification
          type="danger"
          title="Veuillez entrer un titre"
          className="bg-red-700"
        />
      );
      return;
    }
    const formData: IForm = {
      ...form,
      _id: form?._id ?? '',
      title: formTitle,
      fields: selectedFields,
      createdAt: form?.createdAt ?? new Date(),
      updatedAt: new Date(),
    };
    const { data } = await apiUpdateForm(formData);

    if (data.result) {
      toast.push(
        <Notification type="success" title="Formulaire modifié avec succès" />
      );
      navigate('/admin/forms');
    } else {
      toast.push(
        <Notification
          type="danger"
          title="Erreur lors de la modification du formulaire"
        />
      );
    }
  };

  return (
    <div className="h-full">
      <div className="flex justify-between items-center mb-4 gap-8">
        <Input
          placeholder="Titre du formulaire"
          value={formTitle}
          onChange={(e) => setFormTitle(e.target.value)}
        />
        <Button variant="solid" size="md" onClick={handleSaveForm}>
          Enregistrer
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 h-full ">
        <Card className="col-span-3 bg-gray-900 h-full">
          <FormFieldsList formFieldTypes={FormFieldTypes} handleFormFieldTypeSelected={handleFormFieldTypeSelected} />
        </Card>
        <Card className="col-span-5 bg-gray-900 h-full">
          {currentField ? (
            <FieldConfig
              selectedField={currentField}
              onConfigChange={handleConfigChange}
              handleAddField={handleAddField}
            />
          ) : (
            <Empty icon={<RxInput className="text-gray-500 text-7xl" />}>
              <p className="text-gray-500 text-xl">Aucun champ sélectionné</p>
              <p className="text-gray-500 text-md">
                Sélectionnez un champ pour le configurer
              </p>
            </Empty>
          )}
        </Card>
        <Card className="col-span-4 bg-gray-900 h-full">
          <ConfigForms
            selectedFields={selectedFields}
            handleDeleteForm={handleDeleteField}
            moveField={moveField}
          />
        </Card>
      </div>
    </div>
  );
}

export default EditForm;
