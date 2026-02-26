import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormContainer } from '@/components/ui/Form';
import Button from '@/components/ui/Button';
import StickyFooter from '@/components/shared/StickyFooter';
import UserFields from './UserFields';
import cloneDeep from 'lodash/cloneDeep';
import { AiOutlineSave } from 'react-icons/ai';
import * as Yup from 'yup';
import { t } from 'i18next';
import { Options, UserFormModel } from '../EditUser';

type UserFormProps = {
  initialData?: UserFormModel;
  onEdition: boolean;
  onDiscard?: () => void;
  onFormSubmit: (formData: UserFormModel) => void;
  customers: Options[];
  producers: Options[];
  roles: Options[];
};

const validationSchema = Yup.object().shape({
  username: Yup.string().required(t('cust.error.username')),
  lastName: Yup.string().required(t('cust.error.lastName')),
  firstName: Yup.string().required(t('cust.error.firstName')),
  //phone: Yup.string().required(t('cust.error.phone')),
  email: Yup.string()
    .email(t('cust.error.invalidEmail'))
    .required(t('cust.error.email')),
  role: Yup.string().required(t('cust.error.role')),
});

const UserForm = (props: UserFormProps) => {
  const {
    onEdition,
    initialData,
    onFormSubmit,
    onDiscard,
    customers,
    producers,
    roles,
  } = props;

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<UserFormModel>({
    resolver: yupResolver(validationSchema) as any,
    defaultValues: initialData,
  });

  const values = watch();

  const onSubmit = async (values: UserFormModel) => {
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
              <UserFields
                onEdition={onEdition}
                errors={errors}
                customers={customers}
                producers={producers}
                roles={roles}
                control={control}
                watch={watch}
                setValue={setValue}
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

export default UserForm;
