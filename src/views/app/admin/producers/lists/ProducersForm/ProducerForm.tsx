import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormContainer } from '@/components/ui/Form';
import Button from '@/components/ui/Button';
import StickyFooter from '@/components/shared/StickyFooter';
import ProducerFields from './ProducerFields';
import CompanyFields from './CompanyFields';
import cloneDeep from 'lodash/cloneDeep';
import { AiOutlineSave } from 'react-icons/ai';
import * as Yup from 'yup';
import { t } from 'i18next';
import { countries } from '@/constants/countries.constant';
import { Options } from '../EditProducer';
import { Producer } from '@/@types/producer';

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
};

type ProducerFormProps = {
  initialData?: ProducerFormModel;
  producerCategories: Options[];
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
  //phone: Yup.string().matches(/^((\\+[1-9]{1,4}[ \\-]*)|(\\([0-9]{2,3}\\)[ \\-]*)|([0-9]{2,4})[ \\-]*)*?[0-9]{3,4}?[ \\-]*[0-9]{3,4}?$/, 'Numéro de téléphone invalide').required(t('p.error.phone')),
  //phone: Yup.string().matches(/^((\+[1-9]{1,4}[ -]?)|(\([0-9]{2,3}\)[ -]?)|([0-9]{2,4})[ -]?)*?[0-9]{3,4}[ -]?[0-9]{3,4}$/, 'Numéro de téléphone invalide').required(t('p.error.phone')),
  phoneNumber: Yup.string()
    .matches(/^0[1-9](?: [0-9]{2}){4}$/, 'Numéro de téléphone invalide')
    .required(t('p.error.phoneNumber')),
});

const ProducerForm = (props: ProducerFormProps) => {
  const { initialData, onFormSubmit, onDiscard, producerCategories } = props;

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
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormContainer>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-2">
              <ProducerFields
                errors={errors}
                control={control}
                countries={countries}
                watch={watch}
                setValue={setValue}
              />
            </div>
            <div className="lg:col-span-2">
              <CompanyFields
                control={control}
                errors={errors as any}
                producerCategories={producerCategories}
                watch={watch}
              />
            </div>
          </div>
          <StickyFooter
            className="-mx-8 px-8 flex items-center justify-end py-4"
            stickyClass="border-t bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          >
            <div className="md:flex items-end">
              <Button
                size="sm"
                className="ltr:mr-3 rtl:ml-3"
                type="button"
                onClick={() => onDiscard?.()}
              >
                {t('cancel')}
              </Button>
              <Button
                size="sm"
                variant="solid"
                loading={isSubmitting}
                icon={<AiOutlineSave />}
                type="submit"
              >
                {t('save')}
              </Button>
            </div>
          </StickyFooter>
        </FormContainer>
      </form>
    </>
  );
};

export default ProducerForm;
