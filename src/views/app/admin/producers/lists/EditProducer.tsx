import ProducerForm, {
  ProducerFormModel,
  SetSubmitting,
} from '@/views/app/admin/producers/lists/ProducersForm';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { PRODUCERS_LIST } from '@/constants/navigation.constant';
import { useEffect, useState } from 'react';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, {
  getProducerById,
  setProducer,
  useAppSelector,
} from '../store';
import {
  apiGetProducerCategories,
  GetProducerCategoriesResponse,
} from '@/services/ProducerCategoryServices';
import {
  apiGetProductCategories,
  GetProductCategoriesResponse,
} from '@/services/ProductCategoryServices';
import { unwrapData } from '@/utils/serviceHelper';
import { Producer, ProducerCategory } from '@/@types/producer';
import {
  apiCreateProducer,
  apiUpdateProducer,
} from '@/services/ProducerServices';
import { toast } from 'react-toastify';

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
  const [productCategoryOptions, setProductCategoryOptions] = useState<Options[]>([]);
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
    // Compétences & Spécialités
    productCategories: producer?.productCategories || [],
    strengths: producer?.strengths || '',
    weaknesses: producer?.weaknesses || '',
    certifications: producer?.certifications || [],
    // Capacité de production
    minOrderQuantity: producer?.minOrderQuantity ?? null,
    maxMonthlyQuantity: producer?.maxMonthlyQuantity ?? null,
    averageDeliveryDays: producer?.averageDeliveryDays ?? null,
    expressDeliveryDays: producer?.expressDeliveryDays ?? null,
    deliveryZone: producer?.deliveryZone || null,
    // Qualité & Fiabilité
    reliabilityScore: producer?.reliabilityScore ?? null,
    customerSatisfactionRate: producer?.customerSatisfactionRate ?? null,
    completedOrdersCount: producer?.completedOrdersCount ?? null,
    internalComments: producer?.internalComments || '',
    // Tarification
    priceRange: producer?.priceRange || null,
    volumeDiscountAvailable: producer?.volumeDiscountAvailable ?? false,
    volumeDiscountRate: producer?.volumeDiscountRate ?? null,
  };

  useEffect(() => {
    if (!producer && onEdition) {
      dispatch(getProducerById(documentId));
    }
    return () => {
      dispatch(setProducer(null));
    };
  }, [dispatch]);

  useEffect(() => {
    fetchProducerCategories();
    fetchProductCategories();
  }, []);

  const fetchProducerCategories = async () => {
    const {
      producerCategories_connection,
    }: { producerCategories_connection: GetProducerCategoriesResponse } =
      await unwrapData(apiGetProducerCategories());
    const producerCategoriesList: ProducerCategory[] =
      producerCategories_connection.nodes || [];
    const producerCategories = producerCategoriesList.map(
      (producerCategory: ProducerCategory) => ({
        value: producerCategory.documentId || '',
        label: producerCategory.name || '',
      })
    );
    setProducerCategories(producerCategories);
  };

  const fetchProductCategories = async () => {
    const {
      productCategories_connection,
    }: { productCategories_connection: GetProductCategoriesResponse } =
      await unwrapData(apiGetProductCategories());
    const options = (productCategories_connection.nodes || []).map((cat) => ({
      value: cat.documentId || '',
      label: cat.name || '',
    }));
    setProductCategoryOptions(options);
  };

  const updateOrCreateProducer = async (
    data: ProducerFormModel
  ): Promise<Producer> => {
    const producer: Omit<Producer, 'documentId' | 'projects'> = {
      companyInformations: {
        address: data.address,
        city: data.city,
        country: data.country,
        email: data.email,
        phoneNumber: data.phoneNumber,
        siretNumber: data.siretNumber,
        vatNumber: data.vatNumber,
        website: data.website,
        zipCode: data.zipCode,
      },
      producerCategory: data.producerCategory,
      name: data.name,
      // Compétences & Spécialités
      productCategories: data.productCategories,
      strengths: data.strengths,
      weaknesses: data.weaknesses,
      certifications: data.certifications,
      // Capacité de production
      minOrderQuantity: data.minOrderQuantity,
      maxMonthlyQuantity: data.maxMonthlyQuantity,
      averageDeliveryDays: data.averageDeliveryDays,
      expressDeliveryDays: data.expressDeliveryDays,
      deliveryZone: data.deliveryZone,
      // Qualité & Fiabilité
      reliabilityScore: data.reliabilityScore,
      customerSatisfactionRate: data.customerSatisfactionRate,
      completedOrdersCount: data.completedOrdersCount,
      internalComments: data.internalComments,
      // Tarification
      priceRange: data.priceRange,
      volumeDiscountAvailable: data.volumeDiscountAvailable,
      volumeDiscountRate: data.volumeDiscountRate,
    };
    if (onEdition) {
      const { updateProducer }: { updateProducer: Producer } = await unwrapData(
        apiUpdateProducer({ documentId: data.documentId, ...producer })
      );
      return updateProducer;
    }
    const { createProducer }: { createProducer: Producer } = await unwrapData(
      apiCreateProducer(producer)
    );
    return createProducer;
  };

  const handleFormSubmit = async (values: ProducerFormModel) => {
    try {
      await updateOrCreateProducer(values);
      navigate(PRODUCERS_LIST);
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la sauvegarde du producteur');
    }
  };

  const handleDiscard = () => {
    navigate(PRODUCERS_LIST);
  };
  return (
    (!onEdition || producer) && (
      <>
        <ProducerForm
          initialData={initialData}
          producerCategories={producerCategories}
          productCategoryOptions={productCategoryOptions}
          onFormSubmit={handleFormSubmit}
          onDiscard={handleDiscard}
        />
      </>
    )
  );
};

export default EditProducer;
