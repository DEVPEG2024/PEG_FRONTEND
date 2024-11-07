import ProducerForm, {
  FormModel,
  SetSubmitting,
} from '@/views/app/admin/producers/lists/ProducerForm';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { useNavigate } from 'react-router-dom';
import { t } from 'i18next';
import {
  CUSTOMERS_LIST,
  PRODUCERS_LIST,
} from '@/constants/navigation.constant';
import useCategoryProducer from '@/utils/hooks/producers/useCategoryProducer';
import { ICategoryProducer } from '@/services/ProducerServices';
import { useEffect, useState } from 'react';
import { createProducer } from '@/utils/hooks/producers/useCreateProducer';

const CustomerNew = () => {
  const navigate = useNavigate();
  const { getCategoriesProducers } = useCategoryProducer();
  const [categories, setCategories] = useState<ICategoryProducer[]>([]);
  useEffect(() => {
    const fetchCategories = async () => {
      const res = await getCategoriesProducers(1, 200, '');
      setCategories(res.data || []);
    };
    fetchCategories();
  }, []);

  const handleFormSubmit = async (
    values: FormModel,

    setSubmitting: SetSubmitting
  ) => {
    setSubmitting(true);
    const res = await createProducer(values);

    if (res.status === 'success') {
      toast.push(
        <Notification title={t('cust.added')} type="success" duration={2500}>
          {res.message}
        </Notification>,
        {
          placement: 'top-center',
        }
      );
      navigate(PRODUCERS_LIST);
      setSubmitting(false);
    } else {
      toast.push(
        <Notification title={t('cust.error.add')} type="danger" duration={2500}>
          {res.message}
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

export default CustomerNew;
