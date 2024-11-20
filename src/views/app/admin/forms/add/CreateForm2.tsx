import { Button, Input, Notification, toast } from '@/components/ui';
import { useState } from 'react';
import { apiCreateForm, CreateFormRequest, CreateFormResponse } from '@/services/FormServices';
import { useNavigate } from 'react-router-dom';
import { unwrapData } from '@/utils/serviceHelper';

function CreateForm() {
  const [formName, setFormName] = useState<string>('');
  const [googleFormUrl, setGoogleFormUrl] = useState<string>('');
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
    const form: CreateFormRequest = {
      name: formName,
      googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSf2pztGomwKb6IQc42cR6S9DnhOMsgDH676D_ZEj13eDGcWFg/viewform?usp=pp_url&entry.820005313=Option+1',
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
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
        />
        <Input
          placeholder="Lien Google Forms"
          value={googleFormUrl}
          onChange={(e) => setGoogleFormUrl(e.target.value)}
        />
      </div>
      <Button variant="solid" size="md" onClick={handleSaveForm}>
        Enregistrer
      </Button>
    </div>
  );
}

export default CreateForm;
