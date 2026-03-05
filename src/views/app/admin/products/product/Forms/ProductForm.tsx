import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormContainer } from '@/components/ui/Form';
import Button from '@/components/ui/Button';
import StickyFooter from '@/components/shared/StickyFooter';
import ProductFields from './ProductFields';
import cloneDeep from 'lodash/cloneDeep';
import { AiOutlineSave } from 'react-icons/ai';
import * as Yup from 'yup';
import { Upload } from '@/components/ui';
import { Product, PriceTier } from '@/@types/product';
import { PegFile } from '@/@types/pegFile';
import { Loading } from '@/components/shared';

interface Options {
  value: string;
  label: string;
}
export type ProductFormModel = Omit<
  Product,
  | 'documentId'
  | 'sizes'
  | 'colors'
  | 'customerCategories'
  | 'customers'
  | 'productCategory'
  | 'form'
  | 'images'
> & {
  documentId?: string;
  sizes: string[];
  colors: string[];
  customerCategories: string[];
  customers: string[];
  productCategory: string | null;
  form: string | null;
  priceTiers: PriceTier[];
  productRef?: string;
  refVisibleToCustomer?: boolean;
};

export type OnDeleteCallback = React.Dispatch<React.SetStateAction<boolean>>;

type OnDelete = (callback: OnDeleteCallback) => void;

type ProductFormProps = {
  initialData?: ProductFormModel;
  type: 'edit' | 'new';
  onDiscard?: () => void;
  onDelete?: OnDelete;
  onFormSubmit: (formData: ProductFormModel) => void;
  sizes: Options[];
  colors: Options[];
  customerCategories: Options[];
  categories: Options[];
  customers: Options[];
  forms: Options[];
  images: PegFile[];
  setImages: (images: PegFile[]) => void;
  imagesLoading: boolean;
  filterSizesListByProductCategory: (productCategoryDocumentId: string) => void;
  filterColorsListByProductCategory: (
    productCategoryDocumentId: string
  ) => void;
};

const validationSchema = Yup.object().shape({
  name: Yup.string().required('Nom du produit requis'),
  priceTiers: Yup.array()
    .of(
      Yup.object().shape({
        minQuantity: Yup.number()
          .min(1, 'La quantité minimale doit être >= 1')
          .required('Quantité minimale requise'),
        price: Yup.number()
          .moreThan(0, 'Le prix doit être supérieur à 0')
          .required('Prix requis'),
      })
    )
    .min(1, 'Au moins un palier de prix est requis')
    .required('Prix requis'),
  description: Yup.string().required('Description requise'),
});

const ProductForm = (props: ProductFormProps) => {
  const {
    type,
    sizes,
    colors,
    forms,
    initialData,
    onFormSubmit,
    onDiscard,
    customerCategories,
    categories,
    customers,
    images,
    setImages,
    imagesLoading,
    filterSizesListByProductCategory,
    filterColorsListByProductCategory,
  } = props;

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<ProductFormModel>({
    resolver: yupResolver(validationSchema) as any,
    defaultValues: initialData,
  });

  const values = watch();

  const onSubmit = async (values: ProductFormModel) => {
    const formData = cloneDeep(values);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    onFormSubmit(formData);
  };

  const onFileAdd = async (file: File) => {
    setImages([...images, { file, name: file.name } as unknown as PegFile]);
  };

  const onFileRemove = (fileName: string) => {
    const imageToDelete: PegFile | undefined = images.find(
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
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormContainer>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <ProductFields
                errors={errors}
                type={type}
                forms={forms}
                sizes={sizes}
                colors={colors}
                customerCategories={customerCategories}
                categories={categories}
                customers={customers}
                filterSizesListByProductCategory={
                  filterSizesListByProductCategory
                }
                filterColorsListByProductCategory={
                  filterColorsListByProductCategory
                }
                control={control}
                watch={watch}
                setValue={setValue}
              />
            </div>
            <div className="lg:col-span-1">
              <h5 className="mb-4">Images du produit</h5>
              <Loading loading={imagesLoading}>
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
              </Loading>
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
      </form>
    </>
  );
};

export default ProductForm;
