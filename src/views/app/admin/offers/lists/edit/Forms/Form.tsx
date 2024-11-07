import { forwardRef } from 'react';
import { FormContainer, FormItem } from '@/components/ui/Form';
import Button from '@/components/ui/Button';
import StickyFooter from '@/components/shared/StickyFooter';
import { Field, Form, Formik, FormikProps } from 'formik';
import BasicInformationFields from './Fields';
import cloneDeep from 'lodash/cloneDeep';
import { AiOutlineDelete, AiOutlineSave } from 'react-icons/ai';
import * as Yup from 'yup';
import { Upload } from '@/components/ui';
import { API_BASE_URL, API_URL_IMAGE } from '@/configs/api.config';
import { useAppSelector } from '../../store';
import { OptionsFields, IProduct } from '@/@types/product';
import { HiEye, HiTrash } from 'react-icons/hi';
import { set } from 'lodash';
import { IOffer } from '@/@types/offer';

interface Options {
  value: string;
  label: string;
}
// eslint-disable-next-line  @typescript-eslint/no-explicit-any
type FormikRef = FormikProps<any>;

type InitialData = IProduct;

export type FormModel = Omit<InitialData, 'type'> & {
  type: string;
};

export type SetSubmitting = (isSubmitting: boolean) => void;

export type OnDeleteCallback = React.Dispatch<React.SetStateAction<boolean>>;

type OnDelete = (callback: OnDeleteCallback) => void;

type ProductForm = {
  initialData?: InitialData;
  type: 'edit' | 'new';
  onDiscard?: () => void;
  onDelete?: OnDelete;
  onFormSubmit: (formData: FormModel, setSubmitting: SetSubmitting) => void;
  customers: Options[];
  setSelectedCustomers: (value: string) => void;
  forms: Options[];
  setForms: (value: string) => void;
};

const validationSchema = Yup.object().shape({
  title: Yup.string().required("Le titre de l'offre requis"),
  price: Yup.number()
    .moreThan(0, 'Le montant doit être supérieur à 0')
    .required('Montant requis'),
  ref: Yup.string().required('Référence requise'),
  description: Yup.string().required('Description requise'),
});

const SaisieForm = forwardRef<FormikRef, ProductForm>((props, ref) => {
  const { offer } = useAppSelector((state) => state.offers.data);

  const {
    type,

    initialData = {
      _id: offer?._id || '',
      title: offer?.title || '',
      price: offer?.price || 0,
      isAvailable: offer?.isAvailable || false,
      images: offer?.images || [],
      ref: offer?.ref || '',
      description: offer?.description || '',
      customer: offer?.customer?._id || '',
      form: offer?.form?._id || '',
    },
    onFormSubmit,
    onDiscard,
    customers,
    forms,
    setSelectedCustomers,
    setForms,
  } = props;
  const onFileUpload = async (
    files: File[],
    setFieldValue: (
      field: string,
      value: any,
      shouldValidate?: boolean
    ) => void,
    field: string
  ) => {
    const formData = new FormData();
    formData.append('file', files[0]);
    try {
      const fileNames = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        try {
          const response = await fetch(API_BASE_URL + '/upload', {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();
          fileNames.push(data.fileName);
        } catch (error) {
          console.error("Erreur lors de l'upload du fichier :", error);
        }
      }
      setFieldValue(field, fileNames);
    } catch (error) {
      console.error("Erreur lors de l'upload du fichier :", error);
    }
  };

  const beforeUpload = (files: FileList | null) => {
    let valid: string | boolean = true;

    const allowedFileType = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
      'application/pdf',
      'application/x-pdf',
      'application/pdf',
      'application/x-pdf',
      'application/pdf',
      'application/x-pdf',
      'application/pdf',
      'application/x-pdf',
      'application/pdf',
      'application/x-pdf',
    ];
    if (files) {
      for (const file of files) {
        if (!allowedFileType.includes(file.type)) {
          valid = 'Veuillez télécharger un fichier .jpeg ou .png!';
        }
      }
    }

    return valid;
  };

  // const onDeleteImage = (e : React.MouseEvent<HTMLButtonElement>,index: number) => {
  //   e.preventDefault()
  //   const updatedImages = initialData.images.filter((_, i) => i !== index);
  //   if (ref && 'current' in ref && ref.current) {
  //     ref.current.setFieldValue("images", updatedImages);
  //   }
  // };

  const onDeleteImage = async (
    e: React.MouseEvent<HTMLButtonElement>,
    index: number,
    setFieldValue: (
      field: string,
      value: any,
      shouldValidate?: boolean
    ) => void,
    field: string
  ) => {
    e.preventDefault();
    const updatedImages = initialData.images.filter((_, i) => i !== index);
    setFieldValue(field, updatedImages);
  };

  return (
    <>
      <Formik
        innerRef={ref}
        initialValues={{
          ...initialData,
          type: type,
        }}
        validationSchema={validationSchema}
        onSubmit={(values: FormModel, { setSubmitting }) => {
          const formData = cloneDeep(values);
          onFormSubmit?.(formData, setSubmitting);
        }}
      >
        {({ values, setFieldValue, touched, errors, isSubmitting }) => {
          return (
            <Form>
              <FormContainer>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <BasicInformationFields
                      touched={touched}
                      errors={errors}
                      type={type}
                      offer={offer || ({} as IOffer)}
                      forms={forms}
                      setForms={setForms}
                      customers={customers}
                      setSelectedCustomers={setSelectedCustomers}
                    />
                  </div>
                  <div className="lg:col-span-1">
                    <h5 className="mb-4">Images du produits</h5>
                    {values.images.length > 0 && (
                      <div className="flex items-center gap-2 mb-4">
                        {values.images.map((img: string, index: number) => (
                          <div
                            key={img}
                            className="group relative rounded border border-gray-950 bg-gray-950  p-2 flex"
                          >
                            <img
                              className="rounded max-h-[140px] max-w-full"
                              src={API_URL_IMAGE + img}
                              alt={img}
                            />
                            <div className="absolute inset-2 bg-gray-900/[.7] group-hover:flex hidden text-xl items-center justify-center">
                              <span
                                className="text-gray-100 hover:text-gray-300 cursor-pointer p-1.5"
                                onClick={(
                                  e: React.MouseEvent<HTMLButtonElement>
                                ) =>
                                  onDeleteImage(
                                    e,
                                    index,
                                    setFieldValue,
                                    'images'
                                  )
                                }
                              >
                                <HiTrash />
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <Upload
                      multiple
                      showList
                      draggable
                      uploadLimit={4}
                      beforeUpload={beforeUpload}
                      onChange={(files) =>
                        onFileUpload(files, setFieldValue, 'images')
                      }
                      field={{ name: 'images' }}
                    />
                  </div>
                </div>
                <StickyFooter
                  className="-mx-8 px-8 flex items-center justify-end py-4"
                  stickyClass="border-t bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                >
                  <Button
                    size="sm"
                    className="ltr:mr-3 rtl:ml-3"
                    type="button"
                    onClick={() => onDiscard?.()}
                  >
                    Annuler
                  </Button>

                  <Button
                    size="sm"
                    variant="solid"
                    loading={isSubmitting}
                    icon={<AiOutlineSave />}
                    type="submit"
                  >
                    Enregistrer
                  </Button>
                </StickyFooter>
              </FormContainer>
            </Form>
          );
        }}
      </Formik>
    </>
  );
});

SaisieForm.displayName = 'SaisieForm';

export default SaisieForm;
