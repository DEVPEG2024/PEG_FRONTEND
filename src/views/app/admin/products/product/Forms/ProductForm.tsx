import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormContainer } from '@/components/ui/Form';
import ProductFields from './ProductFields';
import cloneDeep from 'lodash/cloneDeep';
import * as Yup from 'yup';
import { Upload } from '@/components/ui';
import { Product, PriceTier } from '@/@types/product';
import { PegFile } from '@/@types/pegFile';
import { Loading } from '@/components/shared';
import { useState } from 'react';
import { HiOutlinePhotograph } from 'react-icons/hi';
import { AiOutlineSave } from 'react-icons/ai';

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
  | 'checklist'
  | 'images'
  | 'batFile'
> & {
  documentId?: string;
  sizes: string[];
  colors: string[];
  customerCategories: string[];
  customers: string[];
  productCategory: string | null;
  form: string | null;
  checklist: string | null;
  priceTiers: PriceTier[];
  productRef?: string;
  refVisibleToCustomer?: boolean;
  requiresBat?: boolean;
};

export type OnDeleteCallback = React.Dispatch<React.SetStateAction<boolean>>;
type OnDelete = (callback: OnDeleteCallback) => void;

type ProductFormProps = {
  initialData?: ProductFormModel;
  type: 'edit' | 'new';
  onDiscard?: () => void;
  onDelete?: OnDelete;
  onFormSubmit: (formData: ProductFormModel, batFile: PegFile | null) => void;
  sizes: Options[];
  colors: Options[];
  customerCategories: Options[];
  categories: Options[];
  customers: Options[];
  forms: Options[];
  checklists: Options[];
  images: PegFile[];
  setImages: (images: PegFile[]) => void;
  imagesLoading: boolean;
  currentBatUrl?: string | null;
  filterSizesListByProductCategory: (productCategoryDocumentId: string) => void;
  filterColorsListByProductCategory: (productCategoryDocumentId: string) => void;
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
    checklists,
    initialData,
    onFormSubmit,
    onDiscard,
    customerCategories,
    categories,
    customers,
    images,
    setImages,
    imagesLoading,
    currentBatUrl,
    filterSizesListByProductCategory,
    filterColorsListByProductCategory,
  } = props;

  const [batFile, setBatFile] = useState<PegFile | null>(null);

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

  const onSubmit = async (values: ProductFormModel) => {
    const formData = cloneDeep(values);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    onFormSubmit(formData, batFile);
  };

  const onFileAdd = async (file: File) => {
    setImages([...images, { file, name: file.name } as unknown as PegFile]);
  };

  const onFileRemove = (fileName: string) => {
    const imageToDelete = images.find(({ name }) => name === fileName);
    if (imageToDelete) {
      setImages(images.filter(({ name }) => name !== fileName));
    }
  };

  const beforeUpload = (files: FileList | null) => {
    let valid: string | boolean = true;
    const allowedFileType = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (files) {
      for (const file of files) {
        if (!allowedFileType.includes(file.type)) {
          valid = 'Veuillez télécharger un fichier .jpeg, .png ou .webp';
        }
      }
    }
    return valid;
  };

  const cardStyle: React.CSSProperties = {
    background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
    border: '1.5px solid rgba(255,255,255,0.07)',
    borderRadius: '16px',
    padding: '20px 22px',
    fontFamily: 'Inter, sans-serif',
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormContainer>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px', alignItems: 'start' }}>
          {/* Left: all fields */}
          <div>
            <ProductFields
              errors={errors}
              type={type}
              forms={forms}
              checklists={checklists}
              sizes={sizes}
              colors={colors}
              customerCategories={customerCategories}
              categories={categories}
              customers={customers}
              filterSizesListByProductCategory={filterSizesListByProductCategory}
              filterColorsListByProductCategory={filterColorsListByProductCategory}
              control={control}
              watch={watch}
              setValue={setValue}
              batFile={batFile}
              setBatFile={setBatFile}
              currentBatUrl={currentBatUrl}
            />
          </div>

          {/* Right: images */}
          <div style={{ position: 'sticky', top: '20px' }}>
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <HiOutlinePhotograph size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
                  Images du produit
                </p>
              </div>
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

export default ProductForm;
