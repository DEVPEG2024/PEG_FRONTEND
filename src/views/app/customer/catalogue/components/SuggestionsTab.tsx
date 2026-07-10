import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { HiOutlineLightBulb, HiOutlineSparkles, HiX } from 'react-icons/hi';
import { Product } from '@/@types/product';
import { User } from '@/@types/user';
import { RootState, useAppSelector } from '@/store';
import { apiGetSuggestedProducts } from '@/services/ProductServices';
import { apiCreateTicket } from '@/services/TicketServices';
import { triggerNotification } from '@/services/NotificationService';
import CustomerProductCard from '../../products/lists/CustomerProductCard';

const SkeletonCard = () => (
  <div style={{
    background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
    borderRadius: '18px',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  }}>
    <div style={{ height: '200px', background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
    <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ height: '14px', borderRadius: '6px', background: 'rgba(255,255,255,0.07)', width: '75%' }} />
      <div style={{ height: '10px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', width: '55%' }} />
      <div style={{ height: '32px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', marginTop: '8px' }} />
    </div>
  </div>
);

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px', color: '#fff', fontSize: '13px', padding: '12px 14px',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em',
  textTransform: 'uppercase', marginBottom: '6px', display: 'block',
};

const SuggestionsTab = () => {
  const { user }: { user?: User } = useAppSelector(
    (state: RootState) => state.auth.user
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [curated, setCurated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal « Suggérer un produit »
  const [modalOpen, setModalOpen] = useState(false);
  const [sugName, setSugName] = useState('');
  const [sugDescription, setSugDescription] = useState('');
  const [sugQuantity, setSugQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGetSuggestedProducts()
      .then((result) => {
        if (cancelled) return;
        setProducts(result.products);
        setCurated(result.curated);
      })
      .catch((err) => {
        console.error('[Suggestions] Échec chargement:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resetModal = () => {
    setModalOpen(false);
    setSugName('');
    setSugDescription('');
    setSugQuantity('');
  };

  const submitSuggestion = async () => {
    if (!sugName.trim()) {
      toast.error('Indiquez le produit souhaité');
      return;
    }
    if (!user?.documentId) {
      toast.error('Utilisateur non identifié');
      return;
    }
    setSubmitting(true);
    try {
      const description = [
        sugDescription.trim() && `Besoin : ${sugDescription.trim()}`,
        sugQuantity.trim() && `Quantité estimée : ${sugQuantity.trim()}`,
      ]
        .filter(Boolean)
        .join('\n');
      await apiCreateTicket({
        name: `Suggestion produit — ${sugName.trim()}`,
        description,
        state: 'pending',
        priority: 'medium',
        type: 'features',
        user: user.documentId,
      } as any);

      const rawSenderId = user?.documentId || (user as any)?.id || (user as any)?._id;
      const senderId = rawSenderId != null ? String(rawSenderId) : undefined;
      if (senderId) {
        triggerNotification({
          eventType: 'new_ticket',
          senderId,
          notifyAdmins: true,
          title: 'Suggestion de produit',
          message: `${user.customer?.name || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Un client'} suggère « ${sugName.trim()} » pour le catalogue`,
          link: '/support',
        });
      }
      toast.success("Merci ! Votre suggestion a été transmise à l'équipe PEG.");
      resetModal();
    } catch (err) {
      console.error('[Suggestions] Échec envoi suggestion:', err);
      toast.error("Erreur lors de l'envoi de la suggestion");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <HiOutlineSparkles size={22} style={{ color: '#a99bff' }} />
          Nos suggestions
        </h3>
        <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>
          {curated
            ? 'Une sélection de produits choisie pour vous par l\'équipe PEG'
            : 'Les dernières nouveautés du catalogue'}
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '20px',
        }}>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          gap: '12px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <HiOutlineSparkles size={28} style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', fontWeight: 600, margin: 0 }}>
            Aucune suggestion pour le moment
          </p>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', margin: 0 }}>
            Revenez bientôt, ou dites-nous ce que vous cherchez ci-dessous
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '20px',
        }}>
          {products.map((product) => (
            <CustomerProductCard key={product.documentId} product={product} />
          ))}
        </div>
      )}

      {/* Encart « Suggérer un produit » */}
      <div style={{
        marginTop: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        flexWrap: 'wrap',
        padding: '24px 28px',
        borderRadius: '18px',
        background: 'radial-gradient(120% 160% at 80% 12%, rgba(124,107,255,0.22) 0%, rgba(91,71,224,0.07) 42%, rgba(10,12,22,0.2) 72%), linear-gradient(160deg, #12152a 0%, #0a0c16 100%)',
        border: '1px solid rgba(124,107,255,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
            background: 'rgba(124,107,255,0.14)', border: '1px solid rgba(124,107,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a99bff',
          }}>
            <HiOutlineLightBulb size={24} />
          </div>
          <div>
            <p style={{ color: '#fff', fontSize: '15px', fontWeight: 700, margin: 0 }}>
              Vous ne trouvez pas votre bonheur ?
            </p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '4px 0 0' }}>
              Dites-nous quel produit vous aimeriez voir au catalogue, notre équipe étudiera votre demande.
            </p>
          </div>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 20px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #6d5dfc, #5a47e0)', border: 'none', cursor: 'pointer', color: '#fff',
            fontSize: '13px', fontWeight: 700, fontFamily: 'Inter, sans-serif',
            boxShadow: '0 4px 16px rgba(109,93,252,0.4)', whiteSpace: 'nowrap',
          }}
        >
          <HiOutlineLightBulb size={16} />
          Suggérer un produit
        </button>
      </div>

      {/* Modal suggestion */}
      {modalOpen && (
        <div
          onClick={resetModal}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '480px',
              background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px',
              padding: '26px', fontFamily: 'Inter, sans-serif',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h4 style={{ color: '#fff', fontSize: '17px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <HiOutlineLightBulb size={20} style={{ color: '#a99bff' }} />
                Suggérer un produit
              </h4>
              <button
                onClick={resetModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: '4px', display: 'flex' }}
              >
                <HiX size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Produit souhaité *</label>
                <input
                  value={sugName}
                  onChange={(e) => setSugName(e.target.value)}
                  placeholder="Ex : Gourde isotherme personnalisée"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Décrivez votre besoin</label>
                <textarea
                  value={sugDescription}
                  onChange={(e) => setSugDescription(e.target.value)}
                  placeholder="Usage, matière, personnalisation attendue…"
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={labelStyle}>Quantité estimée</label>
                <input
                  value={sugQuantity}
                  onChange={(e) => setSugQuantity(e.target.value)}
                  placeholder="Ex : 200 pièces"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
              <button
                onClick={resetModal}
                style={{
                  padding: '10px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >
                Annuler
              </button>
              <button
                onClick={submitSuggestion}
                disabled={submitting}
                style={{
                  padding: '10px 20px', borderRadius: '12px', border: 'none',
                  background: submitting ? 'rgba(109,93,252,0.4)' : 'linear-gradient(135deg, #6d5dfc, #5a47e0)',
                  color: '#fff', fontSize: '13px', fontWeight: 700,
                  cursor: submitting ? 'wait' : 'pointer', fontFamily: 'Inter, sans-serif',
                  boxShadow: '0 4px 16px rgba(109,93,252,0.4)',
                }}
              >
                {submitting ? 'Envoi…' : 'Envoyer ma suggestion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuggestionsTab;
