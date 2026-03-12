import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormContainer } from '@/components/ui/Form';
import ProducerFields from './ProducerFields';
import CompanyFields from './CompanyFields';
import SkillsFields from './SkillsFields';
import ProductionCapacityFields from './ProductionCapacityFields';
import QualityFields from './QualityFields';
import PricingFields from './PricingFields';
import cloneDeep from 'lodash/cloneDeep';
import { AiOutlineSave } from 'react-icons/ai';
import * as Yup from 'yup';
import { t } from 'i18next';
import { countries } from '@/constants/countries.constant';
import { Options } from '../EditProducer';
import { DeliveryZone, PriceRange, Producer } from '@/@types/producer';

// remove projects from the form model to avoid deep recursive instantiation
export type ProducerFormModel = Omit<
  Producer,
  'producerCategory' | 'companyInformations' | 'projects'
> & {
  producerCategory: string | null;
  email: string;
  phoneNumber: string;
  vatNumber: string;
  siretNumber: string;
  address: string;
  zipCode: string;
  city: string;
  country: string;
  website: string;
  // Flattened new fields
  productCategories: string[];
  strengths: string;
  weaknesses: string;
  certifications: string[];
  minOrderQuantity: number | null;
  maxMonthlyQuantity: number | null;
  averageDeliveryDays: number | null;
  expressDeliveryDays: number | null;
  deliveryZone: DeliveryZone | null;
  reliabilityScore: number | null;
  customerSatisfactionRate: number | null;
  completedOrdersCount: number | null;
  internalComments: string;
  priceRange: PriceRange | null;
  volumeDiscountAvailable: boolean;
  volumeDiscountRate: number | null;
};

type ProducerFormProps = {
  initialData?: ProducerFormModel;
  producerCategories: Options[];
  productCategoryOptions: Options[];
  onDiscard?: () => void;
  onFormSubmit: (formData: ProducerFormModel) => void;
};

const validationSchema = Yup.object().shape({
  website: Yup.string(),
  siretNumber: Yup.string().required(t('p.error.siretNumber')),
  vatNumber: Yup.string().required(t('p.error.vatNumber')),
  producerCategory: Yup.string().required(t('p.error.producerCategory')),
  name: Yup.string().required(t('p.error.name')),
  address: Yup.string().required(t('p.error.address')),
  zipCode: Yup.string().required(t('p.error.zipCode')),
  city: Yup.string().required(t('p.error.city')),
  country: Yup.string().required(t('p.error.country')),
  email: Yup.string()
    .email(t('p.error.invalidEmail'))
    .required(t('p.error.email')),
  phoneNumber: Yup.string()
    .matches(/^0[1-9](?: [0-9]{2}){4}$/, 'Numéro de téléphone invalide')
    .required(t('p.error.phoneNumber')),
  customerSatisfactionRate: Yup.number().nullable().min(0).max(100),
  reliabilityScore: Yup.number().nullable().min(1).max(5),
  volumeDiscountRate: Yup.number().nullable().min(0).max(100),
});

const ProducerForm = (props: ProducerFormProps) => {
  const { initialData, onFormSubmit, onDiscard, producerCategories, productCategoryOptions } = props;
  const isEditing = !!initialData?.documentId;

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<ProducerFormModel>({
    resolver: yupResolver(validationSchema) as any,
    defaultValues: initialData,
  });

  const onSubmit = async (values: ProducerFormModel) => {
    const formData = cloneDeep(values);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    onFormSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormContainer>
        {/* Page header */}
        <div style={{ paddingTop: '8px', paddingBottom: '20px', fontFamily: 'Inter, sans-serif' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Producteurs
          </p>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            {isEditing ? 'Modifier le producteur' : 'Nouveau producteur'}
          </h2>
        </div>

        {/* Section 1 : Informations générales + Organisation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-0">
          <ProducerFields
            errors={errors}
            control={control}
            countries={countries}
            watch={watch}
            setValue={setValue}
          />
          <CompanyFields
            control={control}
            errors={errors as any}
            producerCategories={producerCategories}
            watch={watch}
          />
        </div>

        {/* Section 2 : Compétences & Capacité de production */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-0">
          <SkillsFields control={control} errors={errors} productCategoryOptions={productCategoryOptions} />
          <ProductionCapacityFields control={control} errors={errors} />
        </div>

        {/* Section 3 : Qualité & Tarification */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-0">
          <QualityFields control={control} errors={errors} />
          <PricingFields control={control} errors={errors} />
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '20px 0 8px', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '8px' }}>
          <button
            type="button"
            onClick={() => onDiscard?.()}
            style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 22px', background: isSubmitting ? 'rgba(47,111,237,0.4)' : 'linear-gradient(90deg, #2f6fed, #1f4bb6)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: isSubmitting ? 'none' : '0 4px 14px rgba(47,111,237,0.35)', fontFamily: 'Inter, sans-serif' }}
          >
            <AiOutlineSave size={15} />
            {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </FormContainer>
    </form>
  );
};

export default ProducerForm;
