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

import { Button, Radio } from '@/components/ui';
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
  const [sizeAndColorsChanged, setSizeAndColorsChanged] =
    useState<boolean>(false);
  const { user }: { user: User } = useRootAppSelector(
    (state: RootState) => state.auth.user
  );
  const amountSelected = sizeAndColorsSelected.reduce(
      (amount, { quantity }) => amount + quantity,
      0
    ),
    tierPriceSelected = product ? getProductPriceForQuantity(product, amountSelected) : 0;

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

  const isAtLeastOneItemWanted = (): boolean => {
    return (
      sizeAndColorsSelected.reduce(
        (quantity, sizeAndColorSelected) =>
          quantity + sizeAndColorSelected.quantity,
        0
      ) > 0
    );
  };

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

  const handleCompleteForm = () => {
    dispatch(setFormDialog(true));
  };

  const handleSizeAndColorsChanged = (
    value: number,
    size: Size,
    color: Color
  ): void => {
    const newSizeAndColorsSelected = determineNewSizeAndColors(
      value,
      size,
      color
    );

    setSizeAndColorsChanged(true);
    dispatch(setSizeAndColorsSelected(newSizeAndColorsSelected));
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

  const determineNewSizeAndColors = (
    value: number,
    size: Size,
    color: Color
  ) => {
    if (value > 0) {
      const index = sizeAndColorsSelected.findIndex(
        (sizeAndColorSelected) =>
          sizeAndColorSelected.size.value === size.value &&
          sizeAndColorSelected.color.value === color.value
      );
      // Trouver l'index de l'option actuelle dans le tableau sizeField
      const newSizeAndColorSelected: SizeAndColorSelection = {
        size,
        color,
        quantity: value,
      };
      // Si l'option existe déjà, la mettre à jour, sinon l'ajouter
      if (index > -1) {
        const newSizeAndColorsSelected = [...sizeAndColorsSelected];
        newSizeAndColorsSelected[index] = newSizeAndColorSelected;
        return newSizeAndColorsSelected;
      } else {
        return [...sizeAndColorsSelected, newSizeAndColorSelected];
      }
    } else {
      return [
        ...sizeAndColorsSelected.filter(
          (sizeAndColorSelected) =>
            !(
              sizeAndColorSelected.size.value === size.value &&
              sizeAndColorSelected.color.value === color.value
            )
        ),
      ];
    }
  };

  const Skeleton = (
    <Container>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '32px',
        background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.07)',
        overflow: 'hidden',
        minHeight: '500px',
      }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {[70, 40, 55, 90, 60].map((w, i) => (
            <div key={i} style={{ height: i === 0 ? '32px' : '16px', borderRadius: '8px', width: `${w}%`, background: 'rgba(255,255,255,0.07)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      </div>
    </Container>
  );

  if (loading) return Skeleton;

  if (error || !product) return (
    <Container>
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(160,185,220,0.7)' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
        <p style={{ margin: 0, fontSize: '15px' }}>
          {error ?? 'Produit introuvable'}
        </p>
        {error && (
          <p style={{ margin: '8px 0 0', fontSize: '11px', fontFamily: 'monospace', color: 'rgba(160,185,220,0.4)' }}>
            {error}
          </p>
        )}
      </div>
    </Container>
  );

  return (
    <Container>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Main card */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '32px',
          background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.07)',
          overflow: 'hidden',
        }}>
          {/* Image panel */}
          <div style={{
            background: '#f8faff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '240px',
            maxHeight: '300px',
            padding: '20px',
          }}>
            {product.images?.[0]?.url ? (
              <img
                src={product.images[0].url}
                alt={product.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: '220px',
                  objectFit: 'contain',
                  display: 'block',
                  borderRadius: '6px',
                  margin: '0 auto',
                }}
              />
            ) : (
              <div style={{ fontSize: '48px', opacity: 0.2 }}>📦</div>
            )}
          </div>

          {/* Info panel */}
          <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Title + ref */}
            <div>
              <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#f0f4ff', letterSpacing: '-0.01em' }}>
                {product.name}
              </h1>
              {product.refVisibleToCustomer && product.productRef && (
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'rgba(160,185,220,0.55)', fontFamily: 'monospace' }}>
                  Réf. {product.productRef}
                </p>
              )}
            </div>

            {/* Price */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: '4px',
              background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
              borderRadius: '10px',
              padding: '10px 18px',
              alignSelf: 'flex-start',
            }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                {tierPriceSelected > 0 ? tierPriceSelected.toFixed(2) : getProductBasePrice(product).toFixed(2)}
              </span>
              <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>€</span>
            </div>

            {/* Description */}
            {product.description && (
              <div style={{ color: 'rgba(160,185,220,0.8)', fontSize: '14px', lineHeight: 1.7 }}>
                <RichTextEditor value={product.description} readOnly={true} />
              </div>
            )}

            {/* Price tiers */}
            {product.priceTiers?.length > 1 && (
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '10px',
                padding: '14px',
                border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'rgba(160,185,220,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                  Tarifs dégressifs
                </p>
                <Radio.Group vertical value={tierPriceSelected}>
                  {product.priceTiers.map((priceTier, index) => (
                    <Radio
                      key={index}
                      value={priceTier.price}
                      disabled={tierPriceSelected !== priceTier.price}
                    >
                      {priceTier.minQuantity}+ pièce{priceTier.minQuantity === 1 ? '' : 's'} : {priceTier.price.toFixed(2)} € chacune
                      {index > 0 && (
                        <i style={{ marginLeft: '6px', color: '#4ade80', fontSize: '12px' }}>
                          — économisez {(((product.priceTiers[0].price - priceTier.price) / product.priceTiers[0].price) * 100).toFixed(1)} %
                        </i>
                      )}
                    </Radio>
                  ))}
                </Radio.Group>
              </div>
            )}

            {/* Sizes & colors */}
            <SizeAndColorsChoice
              product={product}
              sizeAndColorsSelected={sizeAndColorsSelected}
              handleSizeAndColorsChanged={handleSizeAndColorsChanged}
            />

            {/* CTAs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
              {onEdition && (
                <Button
                  style={{ background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 0', fontWeight: 700, fontSize: '15px', width: '100%', cursor: sizeAndColorsChanged ? 'pointer' : 'not-allowed' }}
                  disabled={!sizeAndColorsChanged}
                  onClick={handleEditSizeAndColorsCartItem}
                >
                  Enregistrer les tailles
                </Button>
              )}

              {product.form && (
                <Button
                  style={{ background: formCompleted ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', color: formCompleted ? '#4ade80' : '#a0b9dc', border: `1px solid ${formCompleted ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', padding: '12px 0', fontWeight: 600, fontSize: '14px', width: '100%', cursor: 'pointer' }}
                  onClick={handleCompleteForm}
                >
                  {formCompleted ? '✓ Détails renseignés — Modifier' : 'Renseigner les détails du produit'}
                </Button>
              )}

              {!onEdition && (
                <Button
                  style={{ background: canAddToCart ? 'linear-gradient(90deg, #2f6fed, #1f4bb6)' : 'rgba(255,255,255,0.06)', color: canAddToCart ? '#fff' : 'rgba(160,185,220,0.4)', border: 'none', borderRadius: '10px', padding: '14px 0', fontWeight: 700, fontSize: '15px', width: '100%', cursor: canAddToCart ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
                  disabled={!canAddToCart}
                  onClick={handleAddToCart}
                >
                  Ajouter au panier →
                </Button>
              )}
            </div>
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
