import { useNavigate } from 'react-router-dom';
import { Notification, toast } from '@/components/ui';
import { useEffect, useState } from 'react';
import SaisieForm, { FormModel, SetSubmitting } from '../edit/Forms/Form';
import { IUser } from '@/@types/user';
import useCustomer from '@/utils/hooks/customers/useCustomer';
import { useAppSelector } from '../store';
import { IForm } from '@/@types/form';
import { apiGetForms } from '@/services/FormServices';
import { apiUpdateOffer } from '@/services/OfferServices';
import { IOffer } from '@/@types/offer';

interface Options {
  value: string;
  label: string;
}

const EditSaisie = () => {
  const { offer } = useAppSelector((state) => state.offers.data);
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Options[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string>(
    offer?.customer?._id || ''
  );
  const [forms, setForms] = useState<Options[]>([]);
  const [selectedForms, setSelectedForms] = useState<string>(
    offer?.form?._id || ''
  );

  const { getCustomers } = useCustomer();

  useEffect(() => {
    fetchCustomers();
    fetchForms();
  }, []);

  const fetchCustomers = async () => {
    const response = await getCustomers(1, 1000, '');
    const customersList = response.data || [];
    const customers = customersList.map((customer: IUser) => ({
      value: customer._id || '',
      label: customer.firstName + ' ' + customer.lastName,
    }));
    setCustomers(customers);
  };

  const fetchForms = async () => {
    const response = await apiGetForms(1, 1000, '');
    const formsList = response.data.forms || [];
    const forms = formsList.map((form: IForm) => ({
      value: form._id || '',
      label: form.title,
    }));
    setForms(forms);
  };

  const handleFormSubmit = async (
    values: FormModel,

    setSubmitting: SetSubmitting
  ) => {
    setSubmitting(true);
    const data = {
      ...values,
      customer: selectedCustomers,
      form: selectedForms,
    };
    console.log(data);
    const response = await apiUpdateOffer(data as unknown as IOffer);

    if (response.data.result) {
      toast.push(
        <Notification type="success" title="Succès">
          L'offre a bien été modifié
        </Notification>
      );
      navigate('/admin/offers/list');
    } else {
      toast.push(
        <Notification type="danger" title="Erreur">
          Une erreur est survenue lors de la modification de l'offre
        </Notification>
      );
      setSubmitting(false);
    }
  };
  const handleDiscard = () => {
    navigate('/admin/offers/list');
  };
  return (
    <>
      <SaisieForm
        type="edit"
        onFormSubmit={handleFormSubmit}
        onDiscard={handleDiscard}
        forms={forms}
        setForms={setSelectedForms}
        customers={customers}
        setSelectedCustomers={setSelectedCustomers}
      />
    </>
  );
};

export default EditSaisie;
