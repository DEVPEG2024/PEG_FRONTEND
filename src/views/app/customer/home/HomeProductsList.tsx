import { Product } from '@/@types/product';
import { getProductBasePrice } from '@/utils/productHelpers';
import { toTTC } from '@/utils/priceHelpers';
import { useNavigate } from 'react-router-dom';
import { HiPhotograph } from 'react-icons/hi';

const HomeProductsList = ({ products }: { products: Product[] }) => {
  const navigate = useNavigate();

  return (
    <>
      {products.map((product) => {
        const imageUrl = product.images?.[0]?.url;
        const priceHT = getProductBasePrice(product);
        const priceTTC = toTTC(priceHT);
        return (
          <div
            key={product.documentId}
            onClick={() => navigate(`/customer/product/${product.documentId}`)}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.transform = 'translateY(-4px)';
              el.style.boxShadow = '0 16px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(47,111,237,0.2)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.transform = 'translateY(0)';
              el.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)';
            }}
            style={{
              background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
              borderRadius: '14px',
              padding: '14px',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={product.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <HiPhotograph size={28} style={{ color: 'rgba(255,255,255,0.12)' }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                color: '#fff',
                fontWeight: 600,
                fontSize: '13px',
                lineHeight: 1.35,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginBottom: '6px',
              }}>
                {product.name}
              </p>
              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{
                  background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
                  borderRadius: '100px',
                  padding: '3px 10px',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '13px',
                  letterSpacing: '-0.01em',
                  boxShadow: '0 2px 8px rgba(47,111,237,0.35)',
                  display: 'inline-block',
                }}>
                  {priceHT.toFixed(2)} € HT
                </span>
                <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginTop: '2px', paddingLeft: '2px' }}>
                  {priceTTC.toFixed(2)} € TTC
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};

export default HomeProductsList;
