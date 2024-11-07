import ProducerForm, {
  FormModel,
  SetSubmitting,
} from '@/views/app/admin/teams/TeamForms';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { useNavigate } from 'react-router-dom';
import { CUSTOMERS_LIST } from '@/constants/navigation.constant';
import { useEffect, useState } from 'react';
import { createProducer } from '@/utils/hooks/producers/useCreateProducer';
import { ROLES_OPTIONS } from '@/constants/roles.constant';
import { apiCreateTeam } from '@/services/TeamServices';

export type OptionsRole = {
  label: string;
  value: string;
};

const newTeamMember = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<OptionsRole[]>([]);
  useEffect(() => {
    setCategories(ROLES_OPTIONS);
  }, []);

  const handleFormSubmit = async (
    values: FormModel,

    setSubmitting: SetSubmitting
  ) => {
    setSubmitting(true);
    const res = await apiCreateTeam(values);

    if (res.data.result) {
      toast.push(
        <Notification title="Membre ajouté" type="success" duration={2500}>
          {res.data.message}
        </Notification>,
        {
          placement: 'top-center',
        }
      );
      navigate('/admin/teams');
      setSubmitting(false);
    } else {
      toast.push(
        <Notification title="Erreur d'ajout" type="danger" duration={2500}>
          {res.data.message}
        </Notification>
      );
      setSubmitting(false);
    }
  };

  const handleDiscard = () => {
    navigate(CUSTOMERS_LIST);
  };

  return (
    <>
      <ProducerForm
        type="new"
        categories={categories}
        onFormSubmit={handleFormSubmit}
        onDiscard={handleDiscard}
      />
    </>
  );
};

export default newTeamMember;
