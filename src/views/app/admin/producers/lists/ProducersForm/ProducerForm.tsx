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
import { HiArrowRight, HiArrowLeft, HiCheck } from 'react-icons/hi';
import * as Yup from 'yup';
import { t } from 'i18next';
import { countries } from '@/constants/countries.constant';
import { Options } from '../EditProducer';
import { DeliveryZone, PriceRange, Producer } from '@/@types/producer';
import { useState } from 'react';

const STEP_LABELS = ['Identité', 'Entreprise', 'Expertise'];

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

  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = STEP_LABELS.length;
  const show = (s: number) => currentStep === s;

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
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Producteurs
          </p>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            {isEditing ? 'Modifier le producteur' : 'Nouveau producteur'}
          </h2>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '20px', paddingTop: '4px' }}>
          {STEP_LABELS.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button type="button" onClick={() => setCurrentStep(i)} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: i === currentStep ? '7px 16px' : '7px 12px',
                borderRadius: '100px', border: 'none', cursor: 'pointer',
                background: i < currentStep ? 'rgba(34,197,94,0.12)' : i === currentStep ? 'rgba(47,111,237,0.15)' : 'rgba(255,255,255,0.04)',
                transition: 'all 0.25s',
              }}>
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%', fontSize: '10px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i < currentStep ? '#22c55e' : i === currentStep ? '#2f6fed' : 'rgba(255,255,255,0.08)',
                  color: '#fff', transition: 'all 0.25s',
                }}>
                  {i < currentStep ? <HiCheck size={12} /> : i + 1}
                </div>
                <span style={{
                  fontSize: '12px', fontWeight: 600,
                  color: i < currentStep ? '#4ade80' : i === currentStep ? '#6fa3f5' : 'rgba(255,255,255,0.35)',
                }}>{label}</span>
              </button>
              {i < totalSteps - 1 && <div style={{ width: '20px', height: '1px', background: 'rgba(255,255,255,0.08)' }} />}
            </div>
          ))}
        </div>

        {/* Step 0 : Informations générales (nom, contact, adresse) */}
        {show(0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-0">
            <ProducerFields
              errors={errors}
              control={control}
              countries={countries}
              watch={watch}
              setValue={setValue}
            />
          </div>
        )}

        {/* Step 1 : Entreprise (catégorie, TVA, SIRET, site web) */}
        {show(1) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-0">
            <CompanyFields
              control={control}
              errors={errors as any}
              producerCategories={producerCategories}
              watch={watch}
            />
          </div>
        )}

        {/* Step 2 : Compétences, capacité de production, qualité & tarification */}
        {show(2) && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-0">
              <SkillsFields control={control} errors={errors} productCategoryOptions={productCategoryOptions} />
              <ProductionCapacityFields control={control} errors={errors} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-0">
              <QualityFields control={control} errors={errors} />
              <PricingFields control={control} errors={errors} />
            </div>
          </>
        )}

        {/* Footer with step navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '20px 0 8px', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => onDiscard?.()}
              style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
            >
              Annuler
            </button>
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => s - 1)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              >
                <HiArrowLeft size={14} /> Retour
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {currentStep < totalSteps - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => s + 1)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 22px', background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(47,111,237,0.35)', fontFamily: 'Inter, sans-serif' }}
              >
                Suivant <HiArrowRight size={14} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 22px', background: isSubmitting ? 'rgba(34,197,94,0.4)' : 'linear-gradient(90deg, #22c55e, #16a34a)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: isSubmitting ? 'none' : '0 4px 14px rgba(34,197,94,0.35)', fontFamily: 'Inter, sans-serif' }}
              >
                <AiOutlineSave size={15} />
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            )}
          </div>
        </div>
      </FormContainer>
    </form>
  );
};

export default ProducerForm;
