import FormFieldsList from '../builder/FormFieldsList';
import ConfigForms from '../builder/configForms';
import { Button, Card, Input, Notification, toast } from '@/components/ui';
import { FormFieldType, FormFieldTypes } from '../constants/type';
import { useState } from 'react';
import FieldConfig from '../builder/components/fieldsConfig';
import Empty from '@/components/shared/Empty';
import { RxInput } from 'react-icons/rx';
import { apiCreateForm, CreateFormRequest, CreateFormResponse } from '@/services/FormServices';
import { useNavigate } from 'react-router-dom';
import { IField } from '@/@types/form';
import { unwrapData } from '@/utils/serviceHelper';

function CreateForm() {
  const [selectedFields, setSelectedFields] = useState<IField[]>([]);
  const [currentField, setCurrentField] = useState<FormFieldType | null>(null);
  const [formTitle, setFormTitle] = useState<string>('');
  const navigate = useNavigate();
  const handleFormsSelected = (form: FormFieldType) => {
    const newField = { ...form, id: Date.now().toString() };
    setCurrentField(newField);
  };

  const handleAddField = (field: FormFieldType) => {
    setSelectedFields([...selectedFields, field]);
    setCurrentField(null);
  };

  const handleDeleteForm = (form: FormFieldType) => {
    setSelectedFields(selectedFields.filter((f) => f.id !== form.id));
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
    const form: CreateFormRequest = {
      name: formTitle,
      form_fields: selectedFields,
    };
    const {createForm} : {createForm: CreateFormResponse} = await unwrapData(apiCreateForm(form));

    if (createForm) {
      toast.push(
        <Notification type="success" title="Formulaire créé avec succès" />
      );
      navigate('/admin/forms');
    } else {
      toast.push(
        <Notification
          type="danger"
          title="Erreur lors de la création du formulaire"
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
          <FormFieldsList formFieldTypes={FormFieldTypes} handleFormFieldTypeSelected={handleFormsSelected} />
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
            handleDeleteForm={handleDeleteForm}
            moveField={moveField}
          />
        </Card>
      </div>
    </div>
  );
}

export default CreateForm;
