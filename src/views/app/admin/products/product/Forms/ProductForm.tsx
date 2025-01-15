import { forwardRef } from 'react';
import { FormContainer } from '@/components/ui/Form';
import Button from '@/components/ui/Button';
import StickyFooter from '@/components/shared/StickyFooter';
import { Form, Formik, FormikProps } from 'formik';
import ProductFields from './ProductFields';
import cloneDeep from 'lodash/cloneDeep';
import { AiOutlineSave } from 'react-icons/ai';
import * as Yup from 'yup';
import { Upload } from '@/components/ui';
import { Product } from '@/@types/product';
import { Image } from '@/@types/image';

interface Options {
  value: string;
  label: string;
}
// eslint-disable-next-line  @typescript-eslint/no-explicit-any
type FormikRef = FormikProps<any>;

export type ProductFormModel = Omit<
  Product,
  | 'documentId'
  | 'sizes'
  | 'customerCategories'
  | 'customers'
  | 'productCategory'
  | 'form'
  | 'images'
> & {
  documentId?: string;
  sizes: string[];
  customerCategories: string[];
  customers: string[];
  productCategory: string | null;
  form: string | null;
};

export type SetSubmitting = (isSubmitting: boolean) => void;

export type OnDeleteCallback = React.Dispatch<React.SetStateAction<boolean>>;

type OnDelete = (callback: OnDeleteCallback) => void;

type ProductForm = {
  initialData?: ProductFormModel;
  type: 'edit' | 'new';
  onDiscard?: () => void;
  onDelete?: OnDelete;
  onFormSubmit: (
    formData: ProductFormModel,
    setSubmitting: SetSubmitting
  ) => void;
  sizes: Options[];
  customerCategories: Options[];
  categories: Options[];
  customers: Options[];
  forms: Options[];
  images: Image[];
  setImages: (images: Image[]) => void;
  filterSizesListByProductCategory: (productCategoryDocumentId: string) => void;
};

const validationSchema = Yup.object().shape({
  name: Yup.string().required('Nom du produit requis'),
  price: Yup.number()
    .moreThan(0, 'Le prix doit être supérieur à 0')
    .required('Prix requis'),
  description: Yup.string().required('Description requise'),
});

const ProductForm = forwardRef<FormikRef, ProductForm>((props, ref) => {
  const {
    type,
    sizes,
    forms,
    initialData,
    onFormSubmit,
    onDiscard,
    customerCategories,
    categories,
    customers,
    images,
    setImages,
    filterSizesListByProductCategory,
  } = props;

  const onFileAdd = async (file: File) => {
    setImages([...images, { file, name: file.name }]);
  };

  const onFileRemove = (fileName: string) => {
    const imageToDelete: Image | undefined = images.find(
      ({ name }) => name === fileName
    );

    if (imageToDelete) {
      setImages(images.filter(({ name }) => name !== fileName));
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

  return (
    <>
      <Formik
        innerRef={ref}
        initialValues={{
          ...initialData,
        }}
        validationSchema={validationSchema}
        onSubmit={(values: ProductFormModel, { setSubmitting }) => {
          console.log('Form submitted with values:', values);
          const formData = cloneDeep(values);
          onFormSubmit?.(formData, setSubmitting);
        }}
      >
        {({ values, touched, errors, isSubmitting }) => (
          <Form>
            <FormContainer>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <ProductFields
                    touched={touched}
                    errors={errors}
                    values={values}
                    type={type}
                    forms={forms}
                    sizes={sizes}
                    customerCategories={customerCategories}
                    categories={categories}
                    customers={customers}
                    filterSizesListByProductCategory={
                      filterSizesListByProductCategory
                    }
                  />
                </div>
                <div className="lg:col-span-1">
                  <h5 className="mb-4">Images du produits</h5>
                  <Upload
                    multiple
                    showList
                    draggable
                    uploadLimit={4}
                    beforeUpload={beforeUpload}
                    onFileAdd={(file) => onFileAdd(file)}
                    onFileRemove={(file) => onFileRemove(file)}
                    field={{ name: 'images' }}
                    fileList={images.map(({ file }) => file)}
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
        )}
      </Formik>
    </>
  );
});

ProductForm.displayName = 'SaisieForm';

export default ProductForm;
