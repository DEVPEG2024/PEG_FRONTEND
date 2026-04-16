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
import { HiOutlinePhotograph, HiArrowRight, HiArrowLeft, HiCheck, HiOutlineColorSwatch, HiReply } from 'react-icons/hi';
import { toast } from 'react-toastify';
import WatermarkModal from '@/components/ui/Upload/WatermarkModal';
import { AiOutlineSave } from 'react-icons/ai';

const STEP_LABELS = ['Infos', 'Prix', 'Options', 'BAT & Ref'];

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
  catalogPrice?: number | null;
  pricingMode?: 'tiers' | 'packs' | 'm2';
  pricePerM2?: number;
  minM2?: number;
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
  currentStep: number;
  setCurrentStep: (step: number | ((s: number) => number)) => void;
  filterSizesListByProductCategory: (productCategoryDocumentId: string) => void;
  filterColorsListByProductCategory: (productCategoryDocumentId: string) => void;
};

const validationSchema = Yup.object().shape({
  name: Yup.string().required('Nom du produit requis'),
  priceTiers: Yup.array().when('pricingMode', {
    is: (val: string) => val !== 'm2',
    then: (schema) => schema
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
    otherwise: (schema) => schema.notRequired(),
  }),
  pricePerM2: Yup.number().when('pricingMode', {
    is: 'm2',
    then: (schema) => schema.moreThan(0, 'Prix au m² requis').required('Prix au m² requis'),
    otherwise: (schema) => schema.notRequired(),
  }),
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
    currentStep,
    setCurrentStep,
    filterSizesListByProductCategory,
    filterColorsListByProductCategory,
  } = props;

  const [batFile, setBatFile] = useState<PegFile | null>(null);
  const [watermarkTarget, setWatermarkTarget] = useState<{ file: File; index: number } | null>(null);
  // Store originals before watermark so user can undo
  const [originals, setOriginals] = useState<Map<string, PegFile>>(new Map());
  const totalSteps = STEP_LABELS.length;

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
    await onFormSubmit(formData, batFile);
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

  const handleWatermarkApply = (watermarkedFile: File) => {
    if (!watermarkTarget) return;
    const updated = [...images];
    const original = updated[watermarkTarget.index];
    // Save original before overwriting (keyed by image name)
    const key = original.name || watermarkTarget.index.toString();
    if (!originals.has(key)) {
      setOriginals(new Map(originals).set(key, { ...original }));
    }
    // Clear id/documentId so the watermarked file gets re-uploaded during save
    updated[watermarkTarget.index] = {
      file: watermarkedFile,
      name: watermarkedFile.name,
      url: URL.createObjectURL(watermarkedFile),
      _watermarked: true,
      _originalKey: key,
    } as PegFile & { _watermarked: boolean; _originalKey: string };
    setImages(updated);
    setWatermarkTarget(null);
    toast.success(`Logo appliqué sur ${watermarkedFile.name} (${Math.round(watermarkedFile.size / 1024)} Ko) — pensez à enregistrer`);
  };

  const handleWatermarkUndo = (index: number) => {
    const image = images[index] as PegFile & { _originalKey?: string };
    const key = image._originalKey;
    if (!key || !originals.has(key)) return;
    const updated = [...images];
    updated[index] = originals.get(key)!;
    const newOriginals = new Map(originals);
    newOriginals.delete(key);
    setOriginals(newOriginals);
    setImages(updated);
    toast.info('Logo retiré — image originale restaurée');
  };

  const cardStyle: React.CSSProperties = {
    background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
    border: '1.5px solid rgba(255,255,255,0.07)',
    borderRadius: '16px',
    padding: '20px 22px',
    fontFamily: 'Inter, sans-serif',
  };

  // Show validation errors — jump to the step that has errors
  const onError = (formErrors: any) => {
    console.log('[ProductForm] Validation errors:', formErrors);
    if (formErrors.name || formErrors.description) setCurrentStep(0);
    else if (formErrors.priceTiers || formErrors.pricePerM2) setCurrentStep(1);
  };

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <FormContainer>
        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '20px', paddingTop: '12px' }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px', alignItems: 'start' }}>
          {/* Left: fields for current step */}
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
              images={images}
              setImages={setImages}
              batFile={batFile}
              setBatFile={setBatFile}
              currentBatUrl={currentBatUrl}
              currentStep={currentStep}
            />
          </div>

          {/* Right: images */}
          <div style={{ position: 'sticky', top: '20px' }}>
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <HiOutlinePhotograph size={16} style={{ color: 'rgba(255,255,255,0.55)' }} />
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
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
                  fileList={images.map((pf) => {
                    const file = pf.file as File & { previewUrl?: string };
                    file.previewUrl = pf.url;
                    return file;
                  })}
                  renderFileActions={(file, index) => {
                    const img = images[index] as PegFile & { _watermarked?: boolean };
                    return (
                      <>
                        <button
                          type="button"
                          title="Ajouter un logo"
                          onClick={(e) => { e.stopPropagation(); setWatermarkTarget({ file, index }); }}
                          style={{
                            background: 'rgba(47,111,237,0.15)', border: '1px solid rgba(47,111,237,0.3)',
                            borderRadius: '6px', padding: '4px 6px', cursor: 'pointer',
                            color: '#6fa3f5', display: 'flex', alignItems: 'center',
                            transition: 'all 0.15s',
                          }}
                        >
                          <HiOutlineColorSwatch size={13} />
                        </button>
                        {img?._watermarked && (
                          <button
                            type="button"
                            title="Retirer le logo"
                            onClick={(e) => { e.stopPropagation(); handleWatermarkUndo(index); }}
                            style={{
                              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                              borderRadius: '6px', padding: '4px 6px', cursor: 'pointer',
                              color: '#f87171', display: 'flex', alignItems: 'center',
                              transition: 'all 0.15s',
                            }}
                          >
                            <HiReply size={13} />
                          </button>
                        )}
                      </>
                    );
                  }}
                />
              </Loading>
            </div>
          </div>
        </div>

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
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit(onSubmit, onError)}
                style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 22px', background: isSubmitting ? 'rgba(34,197,94,0.4)' : 'linear-gradient(90deg, #22c55e, #16a34a)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: isSubmitting ? 'none' : '0 4px 14px rgba(34,197,94,0.35)', fontFamily: 'Inter, sans-serif' }}
              >
                <AiOutlineSave size={15} />
                {isSubmitting ? 'Enregistrement…' : 'Enregistrer le produit'}
              </button>
            )}
          </div>
        </div>
      </FormContainer>
      {watermarkTarget && (
        <WatermarkModal
          file={watermarkTarget.file}
          onApply={handleWatermarkApply}
          onClose={() => setWatermarkTarget(null)}
        />
      )}
    </form>
  );
};

export default ProductForm;
