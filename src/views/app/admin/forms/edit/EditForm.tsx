import { Button, Input, Notification, toast } from '@/components/ui';
import { useState } from 'react';
import { apiUpdateForm } from '@/services/FormServices';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../store';
import { Form } from '@/@types/form';

function EditForm() {
  const { form } = useAppSelector((state) => state.forms.data);
  const [formName, setFormName] = useState<string>(form?.name ?? '');
  const [formGoogleFormUrl, setFormGoogleFormUrl] = useState<string>(form?.googleFormUrl ?? '');
  const navigate = useNavigate();

  const handleSaveForm = async () => {
    if (!formName) {
      toast.push(
        <Notification
          type="danger"
          title="Veuillez entrer un titre"
          className="bg-red-700"
        />
      );
      return;
    }
    const formData: Form = {
      ...form,
      name: formName,
      googleFormUrl: formGoogleFormUrl
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
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
        />
        <Input
          placeholder="Lien Google Forms"
          value={formGoogleFormUrl}
          onChange={(e) => setFormGoogleFormUrl(e.target.value)}
        />
        <Button variant="solid" size="md" onClick={handleSaveForm}>
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

export default EditForm;
