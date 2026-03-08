import {
  injectReducer,
  RootState,
  useAppSelector as useRootAppSelector,
} from '@/store';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import reducer, {
  clearState,
  setFormDialog,
  useAppDispatch,
  useAppSelector,
  getProductToShow,
  setSizeAndColorsSelected,
} from './store';
import {
  addToCart,
  CartItemSizeAndColorEdition,
  editSizeAndColorsCartItem,
} from '@/store/slices/base/cartSlice';
import Container from '@/components/shared/Container';

import { Button } from '@/components/ui';
import { Color, Size, SizeAndColorSelection } from '@/@types/product';
import { getProductBasePrice, getProductPriceForQuantity } from '@/utils/productHelpers';
import { CartItem } from '@/@types/cart';
import ModalCompleteForm from '../modal/ModalCompleteForm';
import SizeAndColorsChoice from './SizeAndColorsChoice';
import { RichTextEditor } from '@/components/shared';
import { User } from '@/@types/user';
import { toast } from 'react-toastify';

injectReducer('showProduct', reducer);

type ShowProductParams = {
  documentId: string;
};

const ShowProduct = () => {
  const { documentId } = useParams<ShowProductParams>() as ShowProductParams;
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
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
  const { user }: { user: User } = useRootAppSelector(
    (state: RootState) => state.auth.user
  );

  const amountSelected = sizeAndColorsSelected.reduce(
    (amount, { quantity }) => amount + quantity,
    0
  );
  const tierPriceSelected = product ? getProductPriceForQuantity(product, amountSelected) : 0;
  const unitPrice = tierPriceSelected > 0 ? tierPriceSelected : (product ? getProductBasePrice(product) : 0);
  const totalPrice = amountSelected * unitPrice;

  useEffect(() => {
    if (!product) {
      if (onEdition) {
        navigate('/customer/cart');
      } else {
        dispatch(getProductToShow(documentId));
      }
    }
  }, [dispatch]);

  useEffect(() => {
    if (isFirstRender) {
      setFirstRender(false);
    }
    return () => {
      if (!isFirstRender) {
        dispatch(clearState());
      }
    };
  }, [isFirstRender]);

  useEffect(() => {
    setCanAddToCart(
      product !== null &&
        isAtLeastOneItemWanted() &&
        ((product.form && formCompleted) || !product.form)
    );
  }, [sizeAndColorsSelected, formCompleted, product]);

  const isAtLeastOneItemWanted = (): boolean =>
    sizeAndColorsSelected.reduce((qty, s) => qty + s.quantity, 0) > 0;

  const handleAddToCart = () => {
    dispatch(
      addToCart({
        id: Math.random().toString(16).slice(2),
        product,
        formAnswer,
        sizeAndColors: sizeAndColorsSelected,
        userDocumentId: user.documentId,
      } as CartItem)
    );
    toast.success('Article ajouté au panier');
    navigate(-1);
  };

  const handleCompleteForm = () => dispatch(setFormDialog(true));

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
  const hasTiers = product.priceTiers?.length > 1;
  const activeTierIndex = hasTiers
    ? product.priceTiers.findIndex((t) => t.price === tierPriceSelected)
    : -1;

  // ─── Main render ─────────────────────────────────────────────────────────────
  return (
    <Container>
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(160,185,220,0.5)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', padding: 0 }}
      >
        ← Retour
      </button>

      {/* Card */}
      <div style={{ display: 'flex', flexWrap: 'wrap', background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>

        {/* ── Image panel ─────────────────────────────────────────────────── */}
        <div style={{ flex: '0 0 auto', width: '300px', maxWidth: '100%', background: '#f8faff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '280px', padding: '24px' }}>
          {product.images?.[0]?.url ? (
            <img
              src={product.images[0].url}
              alt={product.name}
              style={{ maxWidth: '100%', maxHeight: '220px', objectFit: 'contain', borderRadius: '6px' }}
            />
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

        {/* ── Info panel ──────────────────────────────────────────────────── */}
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
            <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '3px', background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)', borderRadius: '10px', padding: '8px 16px' }}>
              <span style={{ fontSize: '26px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                {unitPrice.toFixed(2)}
              </span>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>€ / pièce</span>
            </div>
            {hasTiers && amountSelected > 0 && activeTierIndex > 0 && (
              <div style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px', padding: '5px 10px', fontSize: '12px', color: '#4ade80', fontWeight: 700 }}>
                -{(((product.priceTiers[0].price - tierPriceSelected) / product.priceTiers[0].price) * 100).toFixed(0)}% appliqué
              </div>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div className="product-desc" style={{ color: 'rgba(160,185,220,0.75)', fontSize: '13px', lineHeight: 1.5, marginBottom: '20px' }}>
              <style>{`.product-desc p { margin: 0 0 6px 0; } .product-desc p:last-child { margin-bottom: 0; } .product-desc .ql-editor { padding: 0; } .product-desc ul, .product-desc ol { margin: 4px 0; padding-left: 18px; }`}</style>
              <RichTextEditor value={product.description} readOnly={true} />
            </div>
          )}

          {/* Tier pricing table */}
          {hasTiers && (
            <div style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ margin: '0 0 10px', fontSize: '11px', color: 'rgba(160,185,220,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                Tarifs dégressifs
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {product.priceTiers.map((tier, i) => {
                  const isActive = tier.price === tierPriceSelected;
                  const savings = i > 0
                    ? Math.round(((product.priceTiers[0].price - tier.price) / product.priceTiers[0].price) * 100)
                    : null;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: '8px', background: isActive ? 'rgba(47,111,237,0.15)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isActive ? 'rgba(47,111,237,0.35)' : 'rgba(255,255,255,0.05)'}`, transition: 'all 0.15s' }}>
                      <span style={{ fontSize: '13px', color: isActive ? '#a0c4ff' : 'rgba(160,185,220,0.5)' }}>
                        {isActive && <span style={{ marginRight: '6px' }}>▶</span>}
                        {tier.minQuantity}+ pièce{tier.minQuantity > 1 ? 's' : ''}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {savings && (
                          <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 700, background: 'rgba(74,222,128,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                            -{savings}%
                          </span>
                        )}
                        <span style={{ fontSize: '14px', fontWeight: isActive ? 700 : 400, color: isActive ? '#fff' : 'rgba(160,185,220,0.6)' }}>
                          {tier.price.toFixed(2)} €
                        </span>
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
              Votre commande
            </p>
            <SizeAndColorsChoice
              product={product}
              sizeAndColorsSelected={sizeAndColorsSelected}
              handleSizeAndColorsChanged={handleSizeAndColorsChanged}
            />
          </div>

          {/* Résumé total */}
          {amountSelected > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(47,111,237,0.1) 0%, rgba(31,75,182,0.06) 100%)', border: '1px solid rgba(47,111,237,0.25)', borderRadius: '12px', padding: '14px 18px', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '13px', color: 'rgba(160,185,220,0.7)' }}>
                <span style={{ fontWeight: 700, color: '#7eb3ff', fontSize: '15px' }}>{amountSelected}</span>
                {' '}pièce{amountSelected > 1 ? 's' : ''}
                {' × '}
                <span style={{ fontWeight: 700, color: '#7eb3ff' }}>{unitPrice.toFixed(2)} €</span>
              </div>
              <div style={{ fontWeight: 800, fontSize: '22px', color: '#fff', letterSpacing: '-0.02em' }}>
                {totalPrice.toFixed(2)}<span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginLeft: '4px' }}>€</span>
              </div>
            </div>
          )}

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {onEdition && (
              <Button
                style={{ background: sizeAndColorsChanged ? 'linear-gradient(90deg, #2f6fed, #1f4bb6)' : 'rgba(255,255,255,0.05)', color: sizeAndColorsChanged ? '#fff' : 'rgba(160,185,220,0.35)', border: 'none', borderRadius: '10px', padding: '13px 0', fontWeight: 700, fontSize: '15px', width: '100%', cursor: sizeAndColorsChanged ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
                disabled={!sizeAndColorsChanged}
                onClick={handleEditSizeAndColorsCartItem}
              >
                Enregistrer les tailles
              </Button>
            )}

            {product.form && (
              <Button
                style={{ background: formCompleted ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)', color: formCompleted ? '#4ade80' : 'rgba(160,185,220,0.6)', border: `1px solid ${formCompleted ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '10px', padding: '11px 0', fontWeight: 600, fontSize: '13px', width: '100%', cursor: 'pointer' }}
                onClick={handleCompleteForm}
              >
                {formCompleted ? '✓ Détails renseignés — Modifier' : '+ Renseigner les détails du produit'}
              </Button>
            )}

            {!onEdition && (
              <Button
                style={{ background: canAddToCart ? 'linear-gradient(90deg, #2f6fed, #1f4bb6)' : 'rgba(255,255,255,0.05)', color: canAddToCart ? '#fff' : 'rgba(160,185,220,0.25)', border: 'none', borderRadius: '10px', padding: '15px 0', fontWeight: 700, fontSize: '16px', width: '100%', cursor: canAddToCart ? 'pointer' : 'not-allowed', transition: 'all 0.2s', letterSpacing: '0.01em' }}
                disabled={!canAddToCart}
                onClick={handleAddToCart}
              >
                {canAddToCart ? `Ajouter au panier — ${totalPrice.toFixed(2)} €` : 'Sélectionnez une quantité'}
              </Button>
            )}
          </div>

        </div>
      </div>

      {product.form && (
        <ModalCompleteForm form={product.form} onEdition={onEdition} />
      )}
    </Container>
  );
};

export default ShowProduct;
