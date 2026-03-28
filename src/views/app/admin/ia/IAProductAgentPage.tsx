import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PegFile } from '@/@types/pegFile';
import { Color, Product, ProductCategory, Size } from '@/@types/product';
import { Customer, CustomerCategory } from '@/@types/customer';
import { Form } from '@/@types/form';
import { Checklist } from '@/@types/checklist';
import ProductForm, { ProductFormModel } from '../products/product/Forms/ProductForm';
import { apiCreateProduct } from '@/services/ProductServices';
import { apiUploadFile } from '@/services/FileServices';
import { apiGetCustomers, GetCustomersResponse } from '@/services/CustomerServices';
import { apiGetCustomerCategories, GetCustomerCategoriesResponse } from '@/services/CustomerCategoryServices';
import { apiGetProductCategories, GetProductCategoriesResponse } from '@/services/ProductCategoryServices';
import { apiGetForms, GetFormsResponse } from '@/services/FormServices';
import { apiGetChecklists, GetChecklistsResponse } from '@/services/ChecklistServices';
import { apiGetProductCategorySizes } from '@/services/SizeServices';
import { apiGetProductCategoryColors } from '@/services/ColorServices';
import { apiAiFillProduct, apiGenerateProductImage } from '@/services/ChatbotServices';
import { unwrapData } from '@/utils/serviceHelper';
import { toast } from 'react-toastify';
import { Container } from '@/components/shared';
import { HiSparkles, HiArrowRight } from 'react-icons/hi';

interface Options {
  value: string;
  label: string;
}

const IAProductAgentPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [productName, setProductName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Options lists
  const [customers, setCustomers] = useState<Options[]>([]);
  const [customerCategories, setCustomerCategories] = useState<Options[]>([]);
  const [sizes, setSizes] = useState<Options[]>([]);
  const [colors, setColors] = useState<Options[]>([]);
  const [productCategories, setProductCategories] = useState<Options[]>([]);
  const [forms, setForms] = useState<Options[]>([]);
  const [checklists, setChecklists] = useState<Options[]>([]);
  const [images, setImages] = useState<PegFile[]>([]);
  const [initialData, setInitialData] = useState<ProductFormModel | null>(null);

  // Fetch all option lists on mount
  useEffect(() => {
    fetchAllOptions();
  }, []);

  const fetchAllOptions = async () => {
    try {
      const [custRes, custCatRes, prodCatRes, formsRes, checkRes] = await Promise.all([
        unwrapData(apiGetCustomers()),
        unwrapData(apiGetCustomerCategories()),
        unwrapData(apiGetProductCategories()),
        unwrapData(apiGetForms()),
        unwrapData(apiGetChecklists()),
      ]);

      const custList = (custRes as any).customers_connection?.nodes || [];
      setCustomers(custList.map((c: Customer) => ({ value: c.documentId, label: c.name })));

      const custCatList = (custCatRes as any).customerCategories_connection?.nodes || [];
      setCustomerCategories(custCatList.map((c: CustomerCategory) => ({ value: c.documentId, label: c.name })));

      const prodCatList = (prodCatRes as any).productCategories_connection?.nodes || [];
      setProductCategories(prodCatList.map((c: ProductCategory) => ({ value: c.documentId, label: c.name })));

      const formsList = (formsRes as any).forms_connection?.nodes || [];
      setForms(formsList.map((f: Form) => ({ value: f.documentId, label: f.name })));

      const checksList = (checkRes as any).checklists_connection?.nodes || [];
      setChecklists(checksList.map((c: Checklist) => ({ value: c.documentId, label: c.name })));
    } catch {
      // Options will be empty — user can still fill manually
    }
  };

  const updateSizesList = async (productCategoryDocumentId: string) => {
    const { sizes: sizesList }: { sizes: Size[] } = await unwrapData(
      apiGetProductCategorySizes(productCategoryDocumentId || '')
    );
    const newSizes = sizesList.map((s: Size) => ({ value: s.documentId, label: s.name }));
    setSizes(newSizes);
    return newSizes;
  };

  const updateColorsList = async (productCategoryDocumentId: string) => {
    const { colors: colorsList }: { colors: Color[] } = await unwrapData(
      apiGetProductCategoryColors(productCategoryDocumentId || '')
    );
    const newColors = colorsList.map((c: Color) => ({ value: c.documentId, label: c.name }));
    setColors(newColors);
    return newColors;
  };

  const handleGenerate = async () => {
    if (!productName.trim()) {
      setError('Saisissez un nom de produit.');
      return;
    }
    setError('');
    setGenerating(true);

    try {
      const sizeLabels = sizes.map((s) => s.label);
      const colorLabels = colors.map((c) => c.label);
      const categoryLabels = productCategories.map((c) => c.label);
      const formLabels = forms.map((f) => f.label);
      const checklistLabels = checklists.map((c) => c.label);

      // Run AI text fill + image generation in parallel
      const [fillResult, imgResult] = await Promise.allSettled([
        apiAiFillProduct(productName.trim(), sizeLabels, colorLabels, categoryLabels, formLabels, checklistLabels),
        apiGenerateProductImage(productName.trim()),
      ]);

      const formData: ProductFormModel = {
        documentId: '',
        name: productName.trim(),
        description: '',
        priceTiers: [{ minQuantity: 1, price: 0 }],
        sizes: [],
        colors: [],
        customerCategories: [],
        productCategory: null,
        customers: [],
        form: null,
        checklist: null,
        active: false,
        inCatalogue: true,
        productRef: '',
        refVisibleToCustomer: false,
        requiresBat: false,
      };

      let currentSizes = sizes;
      let currentColors = colors;

      if (fillResult.status === 'fulfilled') {
        const res = fillResult.value.data;

        if (res.description) formData.description = res.description;
        if (res.priceTiers?.length) formData.priceTiers = res.priceTiers;

        // Category
        if (res.suggestedCategory) {
          const catOption = productCategories.find((c) => c.label.toLowerCase() === res.suggestedCategory.toLowerCase());
          if (catOption) {
            formData.productCategory = catOption.value;
            // Fetch sizes/colors for this category
            [currentSizes, currentColors] = await Promise.all([
              updateSizesList(catOption.value),
              updateColorsList(catOption.value),
            ]);
          }
        }

        // Sizes
        if (res.suggestedSizes?.length) {
          const ids = res.suggestedSizes
            .map((label: string) => currentSizes.find((s) => s.label.toLowerCase() === label.toLowerCase())?.value)
            .filter((v: string | undefined): v is string => !!v);
          if (ids.length) formData.sizes = ids;
        }

        // Colors — always include Blanc + Noir + AI suggestions
        const defaultColorNames = ['blanc', 'noir'];
        const aiColorNames = (res.suggestedColors || []).map((l: string) => l.toLowerCase());
        const allColorNames = [...new Set([...defaultColorNames, ...aiColorNames])];
        const colorIds = allColorNames
          .map((n) => currentColors.find((c) => c.label.toLowerCase() === n)?.value)
          .filter((v): v is string => !!v);
        if (colorIds.length) formData.colors = colorIds;

        // Form
        if (res.suggestedForm) {
          const formOption = forms.find((f) => f.label.toLowerCase() === res.suggestedForm.toLowerCase());
          if (formOption) formData.form = formOption.value;
        }

        // Checklist
        if (res.suggestedChecklist) {
          const checklistOption = checklists.find((c) => c.label.toLowerCase() === res.suggestedChecklist.toLowerCase());
          if (checklistOption) formData.checklist = checklistOption.value;
        }
      } else {
        setError('Erreur lors de la generation IA du texte. Vous pouvez modifier manuellement.');
      }

      // AI generated image
      const newImages: PegFile[] = [];
      if (imgResult.status === 'fulfilled' && imgResult.value.data.imageUrl) {
        try {
          const imgResp = await fetch(imgResult.value.data.imageUrl);
          const blob = await imgResp.blob();
          const safeName = productName.trim().replace(/\s+/g, '-').toLowerCase();
          const file = new File([blob], `${safeName}-ai.jpg`, { type: blob.type || 'image/jpeg' });
          newImages.push({ file, name: file.name } as unknown as PegFile);
        } catch {
          // Image fetch failed silently
        }
      }

      setImages(newImages);
      setInitialData(formData);
      setStep('preview');
    } catch {
      setError('Erreur inattendue. Reessayez.');
    } finally {
      setGenerating(false);
    }
  };

  const handleFormSubmit = async (values: ProductFormModel, batFile: PegFile | null) => {
    try {
      let batFileId: string | undefined;
      if (batFile?.file) {
        const uploaded = await apiUploadFile(batFile.file);
        batFileId = uploaded.documentId;
      }

      const newImages: PegFile[] = [];
      for (const image of images) {
        if (image.id) {
          newImages.push(image);
        } else {
          const imageUploaded: PegFile = await apiUploadFile(image.file);
          newImages.push(imageUploaded);
        }
      }

      const data: any = {
        ...values,
        images: newImages.map(({ id }) => id),
        active: true,
        priceTiers: values.priceTiers,
        ...(batFileId !== undefined && { batFile: batFileId }),
      };
      if (!values.form) data.form = null;
      if (!values.checklist) data.checklist = null;
      delete data.documentId;

      await unwrapData(apiCreateProduct(data));
      toast.success('Produit cree avec succes !');
      navigate('/admin/products');
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la creation du produit');
    }
  };

  const handleDiscard = () => {
    setStep('input');
    setInitialData(null);
    setImages([]);
  };

  if (step === 'preview' && initialData) {
    return (
      <Container style={{ fontFamily: 'Inter, sans-serif' }}>
        <div style={{ paddingTop: '28px', paddingBottom: '16px' }}>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Agent Produit IA
          </p>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Apercu du produit genere
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: '6px' }}>
            Verifiez et modifiez les champs avant de creer le produit.
          </p>
        </div>
        <ProductForm
          type="new"
          onFormSubmit={handleFormSubmit}
          onDiscard={handleDiscard}
          sizes={sizes}
          colors={colors}
          customers={customers}
          customerCategories={customerCategories}
          categories={productCategories}
          forms={forms}
          checklists={checklists}
          images={images}
          setImages={setImages}
          imagesLoading={false}
          currentBatUrl={null}
          initialData={initialData}
          filterSizesListByProductCategory={(docId) => { updateSizesList(docId); }}
          filterColorsListByProductCategory={(docId) => { updateColorsList(docId); }}
        />
      </Container>
    );
  }

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif' }}>
      <div style={{ paddingTop: '28px', paddingBottom: '24px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
          Intelligence Artificielle
        </p>
        <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
          Agent Produit IA
        </h2>
      </div>

      <div style={{
        maxWidth: '600px',
        background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        padding: '32px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <HiSparkles size={20} style={{ color: '#6b9eff' }} />
          <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, margin: 0 }}>
            Creer un produit complet avec l'IA
          </h3>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', lineHeight: 1.6, marginBottom: '24px' }}>
          Entrez le nom du produit et l'IA generera automatiquement : description commerciale, image, prix coherents avec le marche, tailles, couleurs, categorie, formulaire et checklist.
        </p>

        <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
          Nom du produit
        </label>
        <input
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !generating && handleGenerate()}
          placeholder="Ex: Casquette brodee, Veste softshell, Mug personnalise..."
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: '10px',
            padding: '12px 14px',
            color: '#fff',
            fontSize: '14px',
            fontFamily: 'Inter, sans-serif',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; }}
        />

        {error && (
          <p style={{ color: '#f87171', fontSize: '12px', marginTop: '8px' }}>{error}</p>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            marginTop: '20px',
            padding: '12px 20px',
            background: generating ? 'rgba(47,111,237,0.4)' : 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
            border: 'none',
            borderRadius: '10px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: generating ? 'not-allowed' : 'pointer',
            boxShadow: generating ? 'none' : '0 4px 14px rgba(47,111,237,0.4)',
            fontFamily: 'Inter, sans-serif',
            transition: 'all 0.2s',
          }}
        >
          {generating ? (
            <>
              <div style={{
                width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              Generation en cours...
            </>
          ) : (
            <>
              <HiSparkles size={16} />
              Generer le produit
              <HiArrowRight size={14} />
            </>
          )}
        </button>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </Container>
  );
};

export default IAProductAgentPage;
