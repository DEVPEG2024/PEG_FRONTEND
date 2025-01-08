import ProducerForm, {
  ProducerFormModel,
  SetSubmitting,
} from '@/views/app/admin/producers/lists/ProducersForm';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { PRODUCERS_LIST } from '@/constants/navigation.constant';
import { useEffect, useState } from 'react';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, { getProducerById, setProducer, useAppSelector } from '../store';
import { apiGetProducerCategories, GetProducerCategoriesResponse } from '@/services/ProducerCategoryServices';
import { unwrapData } from '@/utils/serviceHelper';
import { Producer, ProducerCategory } from '@/@types/producer';
import { apiCreateProducer, apiUpdateProducer } from '@/services/ProducerServices';

injectReducer('producers', reducer);

export interface Options {
  value: string;
  label: string;
}

type EditProducerParams = {
  documentId: string;
};

const EditProducer = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const onEdition: boolean =
    useLocation().pathname.split('/').slice(-2).shift() === 'edit';
  const { documentId } = useParams<EditProducerParams>() as EditProducerParams;
  const { producer } = useAppSelector((state) => state.producers.data);
  const [producerCategories, setProducerCategories] = useState<Options[]>([]);
  const initialData: ProducerFormModel = {
    documentId: documentId ?? '',
    name: producer?.name || '',
    producerCategory: producer?.producerCategory?.documentId || null,
    email: producer?.companyInformations.email || '',
    phoneNumber: producer?.companyInformations.phoneNumber || '',
    vatNumber: producer?.companyInformations.vatNumber || '',
    siretNumber: producer?.companyInformations.siretNumber || '',
    address: producer?.companyInformations.address || '',
    zipCode: producer?.companyInformations.zipCode || '',
    city: producer?.companyInformations.city || '',
    country: producer?.companyInformations.country || '',
    website: producer?.companyInformations.website || '',
  }

  useEffect(() => {
    if (!producer && onEdition) {
      dispatch(getProducerById(documentId));
    } else {
      
    }
    return () => {
      dispatch(setProducer(null))
    }
  }, [dispatch]);
  
  useEffect(() => {
    fetchProducerCategories();
  }, []);

  const fetchProducerCategories = async () => {
    const {producerCategories_connection} : {producerCategories_connection: GetProducerCategoriesResponse}= await unwrapData(apiGetProducerCategories());
    const producerCategoriesList: ProducerCategory[] = producerCategories_connection.nodes || [];
    const producerCategories = producerCategoriesList.map(
      (producerCategory: ProducerCategory) => ({
        value: producerCategory.documentId || '',
        label: producerCategory.name || '',
      })
    );
    setProducerCategories(producerCategories);
  };

  const updateOrCreateProducer = async (data: ProducerFormModel) : Promise<Producer> => {
    const producer: Omit<Producer, 'documentId'> = {
      companyInformations: {
        address: data.address,
        city: data.city,
        country: data.country,
        email: data.email,
        phoneNumber: data.phoneNumber,
        siretNumber: data.siretNumber,
        vatNumber: data.vatNumber,
        website: data.website,
        zipCode: data.zipCode
      },
      producerCategory: data.producerCategory,
      name: data.name,
    }
    if (onEdition) {
      const {updateProducer} : {updateProducer: Producer} = await unwrapData(apiUpdateProducer({documentId: data.documentId, ...producer}));
      return updateProducer
    }
    const {createProducer} : {createProducer: Producer} = await unwrapData(apiCreateProducer(producer));
    return createProducer
  }

  const handleFormSubmit = async (
    values: ProducerFormModel,
    setSubmitting: SetSubmitting
  ) => {
    setSubmitting(true);
    await updateOrCreateProducer(values)
    setSubmitting(false);
    navigate(PRODUCERS_LIST);
  };

  const handleDiscard = () => {
    navigate(PRODUCERS_LIST);
  };
  return (!onEdition || producer) && (
    <>
      <ProducerForm
        initialData={initialData}
        producerCategories={producerCategories}
        onFormSubmit={handleFormSubmit}
        onDiscard={handleDiscard}
      />
    </>
  );
};

export default EditProducer;
