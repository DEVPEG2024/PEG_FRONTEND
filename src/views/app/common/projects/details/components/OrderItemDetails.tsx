import {
  HiAdjustments,
  HiOfficeBuilding,
  HiBookOpen,
  HiExternalLink,
} from 'react-icons/hi';
import { OrderItem } from '@/@types/orderItem';
import { SizeAndColorSelection } from '@/@types/product';
import { useNavigate } from 'react-router-dom';
import { Customer } from '@/@types/customer';

const sep: React.CSSProperties = {
  height: '1px',
  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.1) 75%, transparent)',
  margin: '18px 0',
};

const OrderItemDetails = ({
  orderItem,
  customer,
}: {
  orderItem: OrderItem;
  customer: Customer;
}) => {
  const navigate = useNavigate();

  const productTitle: string = orderItem.product.name;
  const productSizeAndColors: SizeAndColorSelection[] =
    orderItem.sizeAndColorSelections;

  return (
    <div style={{ width: '100%', fontFamily: 'Inter, sans-serif' }}>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '18px' }}>
        Détails de la commande
      </p>

      {/* Client */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{
          width: '30px', height: '30px', borderRadius: '8px',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          color: 'rgba(255,255,255,0.35)',
        }}>
          <HiOfficeBuilding size={14} />
        </div>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1px' }}>Client</p>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 500 }}>{customer?.name ?? 'Client supprimé'}</span>
        </div>
      </div>

      {/* Product */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{
          width: '30px', height: '30px', borderRadius: '8px',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          color: 'rgba(255,255,255,0.35)',
        }}>
          <HiBookOpen size={14} />
        </div>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1px' }}>Produit</p>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 500 }}>{productTitle}</span>
        </div>
      </div>

      {/* Sizes & colors */}
      {productSizeAndColors.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            color: 'rgba(255,255,255,0.35)', marginTop: '2px',
          }}>
            <HiAdjustments size={14} />
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>Sélections</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {productSizeAndColors.map((sizeAndColor) => (
                <div
                  key={sizeAndColor.size.value + sizeAndColor.color.value}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: 'rgba(47,111,237,0.1)', border: '1px solid rgba(47,111,237,0.2)',
                    borderRadius: '6px', padding: '3px 8px',
                    color: '#6b9eff', fontSize: '12px', fontWeight: 500,
                  }}
                >
                  <span>
                    {sizeAndColor.size.value === 'DEFAULT' ? 'Quantité' : sizeAndColor.size.name}
                    {sizeAndColor.color.value !== 'DEFAULT' && ` (${sizeAndColor.color.name})`}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>:</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{sizeAndColor.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={sep} />

      <button
        onClick={() => navigate('/common/orderItem/' + orderItem.documentId)}
        style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          background: 'rgba(47,111,237,0.1)', border: '1px solid rgba(47,111,237,0.25)',
          borderRadius: '9px', padding: '9px 14px',
          color: '#6b9eff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          transition: 'background 0.15s',
        }}
      >
        <HiExternalLink size={14} />
        Voir la commande
      </button>
    </div>
  );
};

export default OrderItemDetails;
