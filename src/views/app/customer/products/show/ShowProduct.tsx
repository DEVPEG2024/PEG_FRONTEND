import {
  injectReducer,
  RootState,
  useAppSelector as useRootAppSelector,
} from '@/store';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import reducer, {
  clearState,
  setFormAnswer,
  setFormCompleted,
  useAppDispatch,
  useAppSelector,
  getProductToShow,
  setSizeAndColorsSelected,
} from './store';
import {
  addToCart,
  CartItemSizeAndColorEdition,
  editSizeAndColorsCartItem,
  editFormAnswerCartItem,
  CartItemFormAnswerEdition,
} from '@/store/slices/base/cartSlice';
import { apiGetOrderItem, apiGetOrderItemByProduct, apiUpdateBatStatus } from '@/services/ProductServices';
import { OrderItem } from '@/@types/orderItem';
import Container from '@/components/shared/Container';

import { Button } from '@/components/ui';
import { Color, Size, SizeAndColorSelection } from '@/@types/product';
import { getProductBasePrice, getProductPriceForQuantity, getCatalogSavingsPercent, isProductPackPricing, isProductM2Pricing, getM2Price } from '@/utils/productHelpers';
import { toTTC } from '@/utils/priceHelpers';
import { CartItem } from '@/@types/cart';
import { FormAnswer } from '@/@types/formAnswer';
import SizeAndColorsChoice from './SizeAndColorsChoice';
import { RichTextEditor } from '@/components/shared';
import { User } from '@/@types/user';
import { toast } from 'react-toastify';
import { HiArrowRight, HiArrowLeft, HiCheck, HiShoppingCart, HiClipboardList, HiEye } from 'react-icons/hi';

const ShowForm = lazy(() => import('../modal/ShowForm'));

injectReducer('showProduct', reducer);

type ShowProductParams = {
  documentId: string;
};

const ShowProduct = () => {
  const { documentId } = useParams<ShowProductParams>() as ShowProductParams;
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderItemId = searchParams.get('orderItemId');
  const onEdition: boolean = useLocation().pathname.split('/').pop() === 'edit';
  const {
    product,
    loading,
    error,
    formCompleted,
    formAnswer,
    sizeAndColorsSelected,
    cartItemId,
  } = useAppSelector((state) => state.showProduct.data);
  const [canAddToCart, setCanAddToCart] = useState<boolean>(false);
  const [isFirstRender, setFirstRender] = useState<boolean>(true);
  const [sizeAndColorsChanged, setSizeAndColorsChanged] = useState<boolean>(false);

  // Wizard state
  const hasForm = !!product?.form;
  const STEPS = hasForm
    ? ['Sélection', 'Détails', 'Récapitulatif'] as const
    : ['Sélection', 'Récapitulatif'] as const;
  const [wizardStep, setWizardStep] = useState(0);
  const formStepIndex = hasForm ? 1 : -1;
  const recapStepIndex = hasForm ? 2 : 1;

  // m² state
  const [m2Width, setM2Width] = useState<number>(100);
  const [m2Height, setM2Height] = useState<number>(100);
  const [m2Quantity, setM2Quantity] = useState<number>(1);

  // BAT state
  const [orderItem, setOrderItem] = useState<Partial<OrderItem> | null>(null);
  const [batAction, setBatAction] = useState<'approve' | 'reject' | null>(null);
  const [batComment, setBatComment] = useState('');
  const [batSubmitting, setBatSubmitting] = useState(false);
  const [batStatusOverride, setBatStatusOverride] = useState<'approved' | 'rejected' | null>(null);
  const { user }: { user: User } = useRootAppSelector(
    (state: RootState) => state.auth.user
  );

  const amountSelected = sizeAndColorsSelected.reduce(
    (amount, { quantity }) => amount + quantity,
    0
  );
  const isPackPricing = product ? isProductPackPricing(product) : false;
  const isM2Pricing = product ? isProductM2Pricing(product) : false;
  const tierPriceSelected = product ? getProductPriceForQuantity(product, amountSelected) : 0;
  const unitPrice = tierPriceSelected > 0 ? tierPriceSelected : (product ? getProductBasePrice(product) : 0);

  // m² pricing calculation
  const m2Data = isM2Pricing && product ? getM2Price(product, m2Width / 100, m2Height / 100, m2Quantity) : null;

  // Total price based on mode
  const totalPrice = isM2Pricing && m2Data
    ? m2Data.total
    : isPackPricing ? unitPrice : amountSelected * unitPrice;

  useEffect(() => {
    if (onEdition && !product) {
      navigate('/customer/cart');
    } else {
      dispatch(getProductToShow(documentId));
    }

    return () => {
      dispatch(clearState());
    };
  }, [dispatch, documentId]);

  useEffect(() => {
    if (orderItemId) {
      apiGetOrderItem(orderItemId).then((res: any) => {
        const data = res.data?.data?.orderItem;
        if (data) setOrderItem(data);
      }).catch((err) => console.error('ShowProduct fetch error:', err));
    } else if (product?.requiresBat && user?.customer?.documentId) {
      apiGetOrderItemByProduct(documentId, user.customer.documentId).then((res: any) => {
        const items = res.data?.data?.orderItems;
        if (items?.length > 0) setOrderItem(items[0]);
      }).catch((err) => console.error('ShowProduct fetch error:', err));
    }
  }, [orderItemId, documentId, product?.requiresBat, user?.customer?.documentId]);

  useEffect(() => {
    if (isFirstRender) {
      setFirstRender(false);
    }
  }, [isFirstRender]);

  useEffect(() => {
    if (isM2Pricing) {
      setCanAddToCart(
        product !== null && m2Width > 0 && m2Height > 0 && m2Quantity > 0 &&
        ((product.form && formCompleted) || !product.form)
      );
    } else {
      setCanAddToCart(
        product !== null &&
          isAtLeastOneItemWanted() &&
          ((product.form && formCompleted) || !product.form)
      );
    }
  }, [sizeAndColorsSelected, formCompleted, product, m2Width, m2Height, m2Quantity, isM2Pricing]);

  const isAtLeastOneItemWanted = (): boolean =>
    sizeAndColorsSelected.reduce((qty, s) => qty + s.quantity, 0) > 0;

  const handleAddToCart = () => {
    // For m² products, create a selection with dimensions
    const sizeAndColors = isM2Pricing
      ? [{ size: {} as any, color: {} as any, quantity: m2Quantity, width: m2Width / 100, height: m2Height / 100 }]
      : sizeAndColorsSelected;

    dispatch(
      addToCart({
        id: Math.random().toString(16).slice(2),
        product,
        formAnswer,
        sizeAndColors,
        userDocumentId: user.documentId,
      } as CartItem)
    );
    toast.success('Article ajouté au panier');
    navigate(-1);
  };

  const handleFormSubmit = (submission: any) => {
    const answer: Partial<FormAnswer> = { form: product!.form!, answer: submission };
    if (onEdition) {
      dispatch(editFormAnswerCartItem({ cartItemId, formAnswer: answer } as CartItemFormAnswerEdition));
      toast.success('Formulaire modifié');
    }
    dispatch(setFormAnswer(answer));
    dispatch(setFormCompleted(true));
    setWizardStep(recapStepIndex);
  };

  const handleBatSubmit = async () => {
    const targetOrderItemId = orderItemId ?? orderItem?.documentId;
    if (!targetOrderItemId || !batAction) return;
    if (batAction === 'reject' && !batComment.trim()) {
      toast.error('Veuillez indiquer le motif du refus');
      return;
    }
    setBatSubmitting(true);
    try {
      await apiUpdateBatStatus(
        targetOrderItemId,
        batAction === 'approve' ? 'approved' : 'rejected',
        batAction === 'reject' ? batComment.trim() : null
      );
      setBatStatusOverride(batAction === 'approve' ? 'approved' : 'rejected');
      setBatAction(null);
      setBatComment('');
      toast.success(batAction === 'approve' ? 'BAT approuvé' : 'BAT refusé');
    } catch {
      toast.error('Erreur lors de la mise à jour du BAT');
    } finally {
      setBatSubmitting(false);
    }
  };

  const handleSizeAndColorsChanged = (value: number, size: Size, color: Color): void => {
    setSizeAndColorsChanged(true);
    dispatch(setSizeAndColorsSelected(determineNewSizeAndColors(value, size, color)));
  };

  const handleEditSizeAndColorsCartItem = () => {
    dispatch(
      editSizeAndColorsCartItem({
        cartItemId,
        sizeAndColors: sizeAndColorsSelected,
      } as CartItemSizeAndColorEdition)
    );
    toast.success('Tailles modifiées');
    navigate('/customer/cart');
  };

  const determineNewSizeAndColors = (value: number, size: Size, color: Color) => {
    // In pack mode, only one size entry per color at a time
    if (isPackPricing && value > 0) {
      const otherColors = sizeAndColorsSelected.filter(
        (s) => color && s.color.value !== color.value
      );
      return [...otherColors, { size, color, quantity: value }];
    }

    if (value > 0) {
      const index = sizeAndColorsSelected.findIndex(
        (s) => s.size.value === size.value && s.color.value === color.value
      );
      const newEntry: SizeAndColorSelection = { size, color, quantity: value };
      if (index > -1) {
        const updated = [...sizeAndColorsSelected];
        updated[index] = newEntry;
        return updated;
      }
      return [...sizeAndColorsSelected, newEntry];
    }
    return sizeAndColorsSelected.filter(
      (s) => !(s.size.value === size.value && s.color.value === color.value)
    );
  };

  // ─── Skeleton ────────────────────────────────────────────────────────────────
  const Skeleton = (
    <Container>
      <div style={{ display: 'flex', gap: '0', background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', minHeight: '480px' }}>
        <div style={{ flex: '0 0 300px', background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ flex: '1', padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[60, 35, 80, 50, 70, 45].map((w, i) => (
            <div key={i} style={{ height: i === 0 ? '28px' : '14px', borderRadius: '6px', width: `${w}%`, background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      </div>
    </Container>
  );

  if (loading) return Skeleton;

  if (error || !product) return (
    <Container>
      <div style={{ padding: '48px', textAlign: 'center', background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.5 }}>⚠️</div>
        <p style={{ margin: 0, fontSize: '15px', color: 'rgba(160,185,220,0.7)' }}>
          {error ?? 'Produit introuvable'}
        </p>
        {error && (
          <p style={{ margin: '8px 0 0', fontSize: '11px', fontFamily: 'monospace', color: 'rgba(160,185,220,0.35)' }}>
            {error}
          </p>
        )}
        <button
          onClick={() => navigate(-1)}
          style={{ marginTop: '20px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 20px', color: '#a0b9dc', cursor: 'pointer', fontSize: '13px' }}
        >
          ← Retour
        </button>
      </div>
    </Container>
  );

  const basePrice = getProductBasePrice(product);
  const savingsPercent = getCatalogSavingsPercent(product, amountSelected > 0 ? amountSelected : 1);
  const hasTiers = product.priceTiers?.length > 1;
  const activeTierIndex = hasTiers
    ? product.priceTiers.findIndex((t) => t.price === tierPriceSelected)
    : -1;

  // ─── Wizard step icons ────────────────────────────────────────────────────────
  const stepIcons = hasForm
    ? [HiShoppingCart, HiClipboardList, HiCheck]
    : [HiShoppingCart, HiCheck];

  const canGoNext = wizardStep === 0
    ? (isM2Pricing ? (m2Width > 0 && m2Height > 0 && m2Quantity > 0) : isAtLeastOneItemWanted())
    : true;

  // ─── Main render ─────────────────────────────────────────────────────────────
  return (
    <Container>
      <style>{`
        @keyframes wizFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Back */}
      <button
        onClick={() => wizardStep > 0 ? setWizardStep(wizardStep - 1) : navigate(-1)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(160,185,220,0.5)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', padding: 0 }}
      >
        ← {wizardStep > 0 ? 'Étape précédente' : 'Retour'}
      </button>

      {/* Card */}
      <div style={{ background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>

        {/* ── Wizard step indicator ──────────────────────────────────────── */}
        <div style={{ padding: '24px 32px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0' }}>
          {STEPS.map((label, i) => {
            const Icon = stepIcons[i];
            const isActive = i === wizardStep;
            const isDone = i < wizardStep;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  onClick={() => { if (isDone) setWizardStep(i); }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    cursor: isDone ? 'pointer' : 'default', minWidth: '90px',
                  }}
                >
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '12px',
                    background: isDone ? 'rgba(34,197,94,0.15)' : isActive ? 'linear-gradient(135deg, rgba(47,111,237,0.25), rgba(47,111,237,0.1))' : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${isDone ? 'rgba(34,197,94,0.4)' : isActive ? 'rgba(47,111,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.3s',
                  }}>
                    {isDone ? <HiCheck size={18} style={{ color: '#4ade80' }} /> : <Icon size={18} style={{ color: isActive ? '#6fa3f5' : 'rgba(160,185,220,0.3)' }} />}
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: isActive ? 700 : 500,
                    color: isDone ? '#4ade80' : isActive ? '#a0c4ff' : 'rgba(160,185,220,0.35)',
                    transition: 'all 0.3s',
                  }}>{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    width: '48px', height: '2px', margin: '0 4px', marginBottom: '20px',
                    background: i < wizardStep ? '#4ade80' : 'rgba(255,255,255,0.08)',
                    borderRadius: '2px', transition: 'background 0.3s',
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Step 0: Sélection ──────────────────────────────────────────── */}
        {wizardStep === 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', animation: 'wizFadeIn 0.3s ease-out' }}>

            {/* Image panel */}
            <div style={{ flex: '0 0 auto', width: '300px', maxWidth: '100%', background: '#f8faff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '280px', padding: '24px' }}>
              {product.images?.[0]?.url ? (
                <img src={product.images[0].url} alt={product.name} style={{ maxWidth: '100%', maxHeight: '220px', objectFit: 'contain', borderRadius: '6px' }} />
              ) : (
                <div style={{ fontSize: '48px', opacity: 0.15 }}>📦</div>
              )}
              {product.images?.length > 1 && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {product.images.slice(1, 5).map((img, i) => (
                    <img key={i} src={img.url} alt="" style={{ width: '44px', height: '44px', objectFit: 'contain', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', padding: '2px' }} />
                  ))}
                </div>
              )}
            </div>

            {/* Info panel */}
            <div style={{ flex: '1 1 360px', minWidth: 0, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '0' }}>

              {/* Name + ref */}
              <div style={{ marginBottom: '16px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#f0f4ff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                  {product.name}
                </h1>
                {product.refVisibleToCustomer && product.productRef && (
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'rgba(160,185,220,0.4)', fontFamily: 'monospace' }}>
                    Réf. {product.productRef}
                  </p>
                )}
              </div>

              {/* Price + tier badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', flexDirection: 'column', background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)', borderRadius: '10px', padding: '8px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                    <span style={{ fontSize: '26px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                      {unitPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                      € HT {isPackPricing ? '/ pack' : '/ pièce'}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                    {toTTC(unitPrice).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € TTC
                  </span>
                  {isPackPricing && amountSelected > 0 && (
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', fontWeight: 600, marginTop: '4px' }}>
                      Pack {amountSelected} sélectionné
                    </span>
                  )}
                </div>
                {hasTiers && amountSelected > 0 && activeTierIndex > 0 && (() => {
                  const baseCPU = isPackPricing ? product.priceTiers[0].price / product.priceTiers[0].minQuantity : product.priceTiers[0].price;
                  const activeTier = product.priceTiers[activeTierIndex];
                  const activeCPU = isPackPricing ? activeTier.price / activeTier.minQuantity : activeTier.price;
                  const pct = ((baseCPU - activeCPU) / baseCPU * 100).toFixed(0);
                  return Number(pct) > 0 ? (
                    <div style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px', padding: '5px 10px', fontSize: '12px', color: '#4ade80', fontWeight: 700 }}>
                      -{pct}% appliqué
                    </div>
                  ) : null;
                })()}
                {savingsPercent && product.catalogPrice && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '5px 12px' }}>
                    <span style={{ fontSize: '13px', color: '#4ade80', fontWeight: 700 }}>
                      -{savingsPercent}% vs catalogue
                    </span>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textDecoration: 'line-through' }}>
                      {product.catalogPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <div className="product-desc" style={{ color: 'rgba(160,185,220,0.75)', fontSize: '12.5px', lineHeight: 1.4, marginBottom: '20px' }}>
                  <style>{`.product-desc p,.product-desc h1,.product-desc h2,.product-desc h3{margin:0 0 2px 0}.product-desc p:last-child{margin-bottom:0}.product-desc .ql-editor,.product-desc .ql-container{padding:0;border:none}.product-desc ul,.product-desc ol{margin:2px 0;padding-left:16px}.product-desc li{margin:0}.product-desc br{display:none}`}</style>
                  <RichTextEditor value={product.description} readOnly={true} />
                </div>
              )}

              {/* Tier pricing table */}
              {hasTiers && (
                <div style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ margin: '0 0 10px', fontSize: '11px', color: 'rgba(160,185,220,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                    {isPackPricing ? 'Choisissez un pack' : 'Tarifs dégressifs'}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {product.priceTiers.map((tier, i) => {
                      const isActive = isPackPricing
                        ? amountSelected === tier.minQuantity
                        : tier.price === tierPriceSelected;
                      const baseCostPerUnit = isPackPricing ? product.priceTiers[0].price / product.priceTiers[0].minQuantity : product.priceTiers[0].price;
                      const tierCostPerUnit = isPackPricing ? tier.price / tier.minQuantity : tier.price;
                      const savings = i > 0
                        ? Math.round(((baseCostPerUnit - tierCostPerUnit) / baseCostPerUnit) * 100)
                        : null;
                      return (
                        <div
                          key={i}
                          onClick={isPackPricing ? () => {
                            const size = product.sizes?.[0] ?? ({ name: 'Default', value: 'DEFAULT', description: 'Default' } as Size);
                            const clr = product.colors?.[0] ?? ({ name: 'Default', value: 'DEFAULT', description: 'Default' } as Color);
                            handleSizeAndColorsChanged(tier.minQuantity, size, clr);
                          } : undefined}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: '8px', background: isActive ? 'rgba(47,111,237,0.15)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isActive ? 'rgba(47,111,237,0.35)' : 'rgba(255,255,255,0.05)'}`, transition: 'all 0.15s', cursor: isPackPricing ? 'pointer' : 'default' }}
                        >
                          <span style={{ fontSize: '13px', color: isActive ? '#a0c4ff' : 'rgba(160,185,220,0.5)' }}>
                            {isActive && <span style={{ marginRight: '6px' }}>▶</span>}
                            {isPackPricing ? `Pack ${tier.minQuantity}` : `${tier.minQuantity}+ pièce${tier.minQuantity > 1 ? 's' : ''}`}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {savings && (
                              <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 700, background: 'rgba(74,222,128,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                -{savings}%
                              </span>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                              <span style={{ fontSize: '14px', fontWeight: isActive ? 700 : 400, color: isActive ? '#fff' : 'rgba(160,185,220,0.6)' }}>
                                {tier.price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT
                              </span>
                              <span style={{ fontSize: '10px', color: isActive ? 'rgba(255,255,255,0.5)' : 'rgba(160,185,220,0.35)' }}>
                                {toTTC(tier.price).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € TTC
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Séparateur + section commande */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px', marginBottom: '16px' }}>
                <p style={{ margin: '0 0 14px', fontSize: '11px', color: 'rgba(160,185,220,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                  {isM2Pricing ? 'Dimensions & quantité' : 'Votre commande'}
                </p>

                {isM2Pricing ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                      <div>
                        <label style={{ display: 'block', color: 'rgba(160,185,220,0.5)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Largeur (cm)</label>
                        <input type="number" value={m2Width} min={1} step={1}
                          onChange={(e) => setM2Width(Math.max(1, parseFloat(e.target.value) || 0))}
                          style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '16px', fontWeight: 700, padding: '12px 14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', textAlign: 'center' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: 'rgba(160,185,220,0.5)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Hauteur (cm)</label>
                        <input type="number" value={m2Height} min={1} step={1}
                          onChange={(e) => setM2Height(Math.max(1, parseFloat(e.target.value) || 0))}
                          style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '16px', fontWeight: 700, padding: '12px 14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', textAlign: 'center' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: 'rgba(160,185,220,0.5)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Quantité</label>
                        <input type="number" value={m2Quantity} min={1} step={1}
                          onChange={(e) => setM2Quantity(Math.max(1, parseInt(e.target.value) || 1))}
                          style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '16px', fontWeight: 700, padding: '12px 14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', textAlign: 'center' }}
                        />
                      </div>
                    </div>

                    {m2Data && (
                      <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '12px', padding: '14px 16px', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: 'rgba(160,185,220,0.6)', fontSize: '12px' }}>Surface</span>
                          <span style={{ color: '#4ade80', fontSize: '13px', fontWeight: 700 }}>{m2Data.area.toFixed(2)} m²{product.minM2 && (m2Width / 100) * (m2Height / 100) < product.minM2 ? ' (min. ' + product.minM2 + ' m²)' : ''}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: 'rgba(160,185,220,0.6)', fontSize: '12px' }}>Prix au m²</span>
                          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600 }}>{(product.pricePerM2 || 0).toFixed(2)} € HT/m²</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: 'rgba(160,185,220,0.6)', fontSize: '12px' }}>Prix unitaire</span>
                          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600 }}>{m2Data.pricePerUnit.toFixed(2)} € HT</span>
                        </div>
                        {m2Quantity > 1 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(160,185,220,0.6)', fontSize: '12px' }}>× {m2Quantity} exemplaire{m2Quantity > 1 ? 's' : ''}</span>
                            <span style={{ color: '#fff', fontSize: '15px', fontWeight: 800 }}>{m2Data.total.toFixed(2)} € HT</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <SizeAndColorsChoice
                    product={product}
                    sizeAndColorsSelected={sizeAndColorsSelected}
                    handleSizeAndColorsChanged={handleSizeAndColorsChanged}
                  />
                )}
              </div>

              {/* Résumé rapide + bouton Suivant */}
              {(isM2Pricing ? m2Data && m2Data.total > 0 : amountSelected > 0) && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(47,111,237,0.1) 0%, rgba(31,75,182,0.06) 100%)', border: '1px solid rgba(47,111,237,0.25)', borderRadius: '12px', padding: '14px 18px', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontSize: '13px', color: 'rgba(160,185,220,0.7)' }}>
                    {isM2Pricing && m2Data ? (
                      <>
                        <span style={{ fontWeight: 700, color: '#4ade80', fontSize: '15px' }}>{m2Data.area.toFixed(2)} m²</span>
                        {m2Quantity > 1 && <span>{' × '}{m2Quantity}</span>}
                      </>
                    ) : isPackPricing ? (
                      <span style={{ fontWeight: 700, color: '#7eb3ff', fontSize: '15px' }}>Pack {amountSelected}</span>
                    ) : (
                      <>
                        <span style={{ fontWeight: 700, color: '#7eb3ff', fontSize: '15px' }}>{amountSelected}</span>
                        {' '}pièce{amountSelected > 1 ? 's' : ''}
                        {' × '}
                        <span style={{ fontWeight: 700, color: '#7eb3ff' }}>{unitPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT</span>
                      </>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: '22px', color: '#fff', letterSpacing: '-0.02em' }}>
                      {totalPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginLeft: '4px' }}>€ HT</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(160,185,220,0.5)', fontWeight: 600 }}>
                      {toTTC(totalPrice).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € TTC
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation step 0 */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                {onEdition && (
                  <Button
                    style={{ background: sizeAndColorsChanged ? 'linear-gradient(90deg, #2f6fed, #1f4bb6)' : 'rgba(255,255,255,0.05)', color: sizeAndColorsChanged ? '#fff' : 'rgba(160,185,220,0.35)', border: 'none', borderRadius: '10px', padding: '13px 20px', fontWeight: 700, fontSize: '14px', cursor: sizeAndColorsChanged ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
                    disabled={!sizeAndColorsChanged}
                    onClick={handleEditSizeAndColorsCartItem}
                  >
                    Enregistrer les tailles
                  </Button>
                )}
                {!onEdition && (
                  <button
                    onClick={() => {
                      if (!canGoNext) { toast.error('Sélectionnez au moins une quantité'); return; }
                      setWizardStep(hasForm ? 1 : recapStepIndex);
                    }}
                    disabled={!canGoNext}
                    style={{
                      padding: '13px 28px', borderRadius: '10px', border: 'none', color: '#fff',
                      fontSize: '14px', fontWeight: 700, cursor: canGoNext ? 'pointer' : 'not-allowed',
                      fontFamily: 'Inter, sans-serif',
                      background: canGoNext ? 'linear-gradient(90deg, #2f6fed, #1f4bb6)' : 'rgba(255,255,255,0.05)',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      boxShadow: canGoNext ? '0 4px 16px rgba(47,111,237,0.3)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    {hasForm ? 'Remplir le formulaire' : 'Récapitulatif'} <HiArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 1: Formulaire (si product.form) ───────────────────────── */}
        {wizardStep === formStepIndex && hasForm && (
          <div style={{ padding: '28px 32px', animation: 'wizFadeIn 0.3s ease-out' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', margin: '0 auto 12px', background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(168,85,247,0.05))', border: '1px solid rgba(168,85,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HiClipboardList size={24} style={{ color: '#c084fc' }} />
              </div>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>Détails du produit</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Renseignez les informations requises</p>
            </div>

            <div className="dialog-formbuilder-body">
              <Suspense fallback={<div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: 40 }}>Chargement...</div>}>
                <ShowForm
                  onSubmit={handleFormSubmit}
                  fields={product.form!.fields!}
                  formAnswer={formAnswer}
                  readOnly={false}
                />
              </Suspense>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button onClick={() => setWizardStep(0)} style={{
                padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <HiArrowLeft size={14} /> Retour
              </button>
              {formCompleted && (
                <button onClick={() => setWizardStep(recapStepIndex)} style={{
                  padding: '10px 24px', borderRadius: '10px', border: 'none', color: '#fff',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  boxShadow: '0 4px 16px rgba(47,111,237,0.3)',
                }}>
                  Récapitulatif <HiArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Step récap: Récapitulatif ──────────────────────────────────── */}
        {wizardStep === recapStepIndex && (
          <div style={{ padding: '28px 32px', animation: 'wizFadeIn 0.3s ease-out' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', margin: '0 auto 12px', background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HiEye size={24} style={{ color: '#4ade80' }} />
              </div>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>Récapitulatif</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Vérifiez votre commande avant d'ajouter au panier</p>
            </div>

            {/* Product summary card */}
            <div style={{ borderRadius: '14px', padding: '18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '14px' }}>
                {product.images?.[0]?.url ? (
                  <img src={product.images[0].url} alt="" style={{ width: '64px', height: '64px', objectFit: 'contain', borderRadius: '10px', background: '#f8faff', padding: '4px' }} />
                ) : (
                  <div style={{ width: '64px', height: '64px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', opacity: 0.15 }}>📦</div>
                )}
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '16px', color: '#f0f4ff' }}>{product.name}</p>
                  {product.refVisibleToCustomer && product.productRef && (
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'rgba(160,185,220,0.4)', fontFamily: 'monospace' }}>Réf. {product.productRef}</p>
                  )}
                </div>
              </div>

              {/* Selections detail */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {isM2Pricing && m2Data ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(160,185,220,0.5)', fontSize: '12px' }}>Dimensions</span>
                      <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>{m2Width} × {m2Height} cm</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(160,185,220,0.5)', fontSize: '12px' }}>Surface</span>
                      <span style={{ color: '#4ade80', fontSize: '13px', fontWeight: 700 }}>{m2Data.area.toFixed(2)} m²</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(160,185,220,0.5)', fontSize: '12px' }}>Quantité</span>
                      <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>{m2Quantity}</span>
                    </div>
                  </>
                ) : (
                  sizeAndColorsSelected.filter(s => s.quantity > 0).map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'rgba(160,185,220,0.5)', fontSize: '12px' }}>
                        {s.size?.name && s.size.name !== 'Default' ? s.size.name : ''}
                        {s.color?.name && s.color.name !== 'Default' ? (s.size?.name && s.size.name !== 'Default' ? ' / ' : '') + s.color.name : ''}
                        {(!s.size?.name || s.size.name === 'Default') && (!s.color?.name || s.color.name === 'Default') ? 'Standard' : ''}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>× {s.quantity}</span>
                    </div>
                  ))
                )}

                {hasForm && formCompleted && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: 'rgba(160,185,220,0.5)', fontSize: '12px' }}>Formulaire</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(34,197,94,0.12)', color: '#4ade80', fontWeight: 700 }}>Complété</span>
                  </div>
                )}
              </div>
            </div>

            {/* Total */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(47,111,237,0.1) 0%, rgba(31,75,182,0.06) 100%)', border: '1px solid rgba(47,111,237,0.25)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'rgba(160,185,220,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: '24px', color: '#fff', letterSpacing: '-0.02em' }}>
                  {totalPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginLeft: '4px' }}>€ HT</span>
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(160,185,220,0.5)', fontWeight: 600 }}>
                  {toTTC(totalPrice).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € TTC
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setWizardStep(hasForm ? formStepIndex : 0)} style={{
                padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <HiArrowLeft size={14} /> Modifier
              </button>
              <button
                onClick={handleAddToCart}
                disabled={!canAddToCart}
                style={{
                  padding: '14px 32px', borderRadius: '12px', border: 'none', color: '#fff',
                  fontSize: '15px', fontWeight: 700, cursor: canAddToCart ? 'pointer' : 'not-allowed',
                  fontFamily: 'Inter, sans-serif',
                  background: canAddToCart ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  boxShadow: canAddToCart ? '0 4px 20px rgba(34,197,94,0.4)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                Ajouter au panier — {toTTC(totalPrice).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € TTC <HiShoppingCart size={16} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── Section BAT ──────────────────────────────────────────────────── */}
      {product.requiresBat && product.batFile?.url && (() => {
        const currentStatus = batStatusOverride ?? (orderItem?.batStatus as 'approved' | 'rejected' | null) ?? null;
        return (
          <div style={{ marginTop: '16px', background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 100%)', borderRadius: '16px', border: '1.5px solid rgba(168,85,247,0.25)', padding: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '18px' }}>📄</span>
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: '#c084fc' }}>Bon à Tirer — Validation requise</p>
                  <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>Veuillez valider le BAT avant de passer commande</p>
                </div>
              </div>
              <a
                href={product.batFile!.url}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '8px', padding: '8px 14px', color: '#c084fc', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
              >
                Voir le BAT →
              </a>
            </div>

            {/* Status badge ou boutons */}
            {currentStatus === 'approved' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '10px', padding: '12px 16px' }}>
                <span style={{ fontSize: '18px' }}>✅</span>
                <span style={{ fontWeight: 700, color: '#4ade80', fontSize: '14px' }}>BAT approuvé</span>
              </div>
            )}

            {currentStatus === 'rejected' && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: orderItem?.batComment ? '8px' : '0' }}>
                  <span style={{ fontSize: '18px' }}>❌</span>
                  <span style={{ fontWeight: 700, color: '#f87171', fontSize: '14px' }}>BAT refusé</span>
                </div>
                {orderItem?.batComment && (
                  <p style={{ margin: 0, fontSize: '12px', color: 'rgba(248,113,113,0.8)', paddingLeft: '26px' }}>{orderItem.batComment}</p>
                )}
              </div>
            )}

            {(currentStatus === null || currentStatus === 'pending') && (
              <div>
                {batAction === null && (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setBatAction('approve')}
                      style={{ flex: 1, minWidth: '140px', background: 'rgba(34,197,94,0.1)', border: '1.5px solid rgba(34,197,94,0.35)', borderRadius: '10px', padding: '12px', color: '#4ade80', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      ✅ Approuver
                    </button>
                    <button
                      onClick={() => setBatAction('reject')}
                      style={{ flex: 1, minWidth: '140px', background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.35)', borderRadius: '10px', padding: '12px', color: '#f87171', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      ❌ Refuser
                    </button>
                  </div>
                )}

                {batAction === 'approve' && (
                  <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', padding: '16px' }}>
                    <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'rgba(74,222,128,0.8)', fontWeight: 600 }}>Confirmer l'approbation du BAT ?</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={handleBatSubmit}
                        disabled={batSubmitting}
                        style={{ flex: 1, background: 'rgba(34,197,94,0.15)', border: '1.5px solid rgba(34,197,94,0.4)', borderRadius: '8px', padding: '10px', color: '#4ade80', fontWeight: 700, fontSize: '13px', cursor: batSubmitting ? 'not-allowed' : 'pointer' }}
                      >
                        {batSubmitting ? 'Envoi…' : '✅ Confirmer l\'approbation'}
                      </button>
                      <button
                        onClick={() => setBatAction(null)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 16px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer' }}
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {batAction === 'reject' && (
                  <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: 'rgba(248,113,113,0.7)', fontWeight: 600, marginBottom: '8px' }}>
                      Motif du refus <span style={{ color: '#f87171' }}>*</span>
                    </label>
                    <textarea
                      value={batComment}
                      onChange={(e) => setBatComment(e.target.value)}
                      placeholder="Décrivez la raison du refus…"
                      rows={3}
                      style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '10px 12px', color: '#f8faff', fontSize: '13px', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button
                        onClick={handleBatSubmit}
                        disabled={batSubmitting || !batComment.trim()}
                        style={{ flex: 1, background: 'rgba(239,68,68,0.15)', border: '1.5px solid rgba(239,68,68,0.4)', borderRadius: '8px', padding: '10px', color: '#f87171', fontWeight: 700, fontSize: '13px', cursor: (batSubmitting || !batComment.trim()) ? 'not-allowed' : 'pointer', opacity: !batComment.trim() ? 0.5 : 1 }}
                      >
                        {batSubmitting ? 'Envoi…' : '❌ Confirmer le refus'}
                      </button>
                      <button
                        onClick={() => { setBatAction(null); setBatComment(''); }}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 16px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer' }}
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}
    </Container>
  );
};

export default ShowProduct;
