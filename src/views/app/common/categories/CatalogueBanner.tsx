import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { HiOutlinePhotograph } from 'react-icons/hi';
import { TbArrowRight } from 'react-icons/tb';
import { Banner } from '@/@types/banner';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN } from '@/constants/roles.constant';
import { apiGetBanners, apiCreateBanner, apiUpdateBanner } from '@/services/BannerServices';
import { apiUploadFile } from '@/services/FileServices';
import { unwrapData } from '@/utils/serviceHelper';

// Nom sentinelle de la bannière dédiée à la page catalogue (partagée par tous)
const BANNER_NAME = 'Bannière catalogue';

const CatalogueBanner = ({
  title,
  subtitle,
  ctaLabel,
  scrollTargetId,
  aspect = '5 / 1',
  minHeight = '130px',
  maxHeight = '260px',
}: {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  scrollTargetId?: string;
  aspect?: string;
  minHeight?: string;
  maxHeight?: string;
}) => {
  const user = useSelector((state: any) => state.auth?.user?.user) as User | undefined;
  const isAdmin = !!user && hasRole(user, [ADMIN, SUPER_ADMIN]);

  const [bannerDocId, setBannerDocId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadBanner = async () => {
    try {
      const { banners_connection } = await unwrapData(
        apiGetBanners({ pagination: { page: 1, pageSize: 1000 }, searchTerm: BANNER_NAME })
      );
      const banner = (banners_connection?.nodes || []).find(
        (b: Banner) => b.name?.trim().toLowerCase() === BANNER_NAME.toLowerCase()
      );
      if (banner) {
        setBannerDocId(banner.documentId);
        setImageUrl(banner.image?.url || '');
      }
    } catch {
      // Lecture impossible (permissions / réseau) — on n'affiche pas de bannière
    }
  };

  useEffect(() => {
    loadBanner();
  }, []);

  const onPick = () => fileRef.current?.click();

  const onCta = () => {
    if (scrollTargetId) {
      document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image trop lourde (max 5 Mo)');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setUploading(true);
    try {
      const uploaded = await apiUploadFile(file);
      if (bannerDocId) {
        await unwrapData(apiUpdateBanner({ documentId: bannerDocId, image: uploaded.id as any, name: BANNER_NAME, active: true } as any));
      } else {
        await unwrapData(apiCreateBanner({ name: BANNER_NAME, image: uploaded.id as any, active: true } as any));
      }
      await loadBanner();
      toast.success('Bannière mise à jour');
    } catch {
      toast.error("Échec de l'envoi de la bannière");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // Pas d'image et pas admin → rien à afficher
  if (!imageUrl && !isAdmin) return null;

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      aspectRatio: aspect,
      minHeight,
      maxHeight,
      borderRadius: '16px',
      overflow: 'hidden',
      marginBottom: '24px',
      border: '1px solid rgba(255,255,255,0.08)',
      background: imageUrl
        ? '#0c0d10'
        : 'linear-gradient(135deg, #131720 0%, #0c0d10 100%)',
      fontFamily: 'Inter, sans-serif',
    }}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title || 'Bannière'}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        // Placeholder admin (aucune image encore)
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
          border: '1.5px dashed rgba(255,255,255,0.14)', borderRadius: '16px',
          color: 'rgba(255,255,255,0.4)',
        }}>
          <HiOutlinePhotograph size={28} />
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Ajouter une image de bannière</span>
          <span style={{ fontSize: '11px', opacity: 0.7 }}>Format conseillé : 1600 × 320 px (paysage)</span>
        </div>
      )}

      {/* Dégradé + titre / sous-titre / bouton */}
      {imageUrl && (title || subtitle || ctaLabel) && (
        <>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 45%, transparent 75%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', left: '32px', bottom: '28px',
            zIndex: 1, maxWidth: '60%',
          }}>
            {title && (
              <h2 style={{ margin: 0, color: '#fff', fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
                {title}
              </h2>
            )}
            {subtitle && (
              <p style={{ margin: '0 0 16px', color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: 400, lineHeight: 1.4, textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>
                {subtitle}
              </p>
            )}
            {ctaLabel && (
              <button
                onClick={onCta}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '10px',
                  background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.5)',
                  borderRadius: '12px', padding: '11px 20px',
                  color: '#fff', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  backdropFilter: 'blur(6px)', transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.3)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.18)')}
              >
                {ctaLabel}
                <TbArrowRight size={16} color="#a78bfa" strokeWidth={2} />
              </button>
            )}
          </div>
        </>
      )}

      {/* Bouton admin : changer l'image */}
      {isAdmin && (
        <>
          <button
            onClick={onPick}
            disabled={uploading}
            style={{
              position: 'absolute', top: '12px', right: '12px', zIndex: 2,
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.18)', borderRadius: '10px',
              padding: '8px 14px', color: '#fff', fontSize: '12px', fontWeight: 600,
              cursor: uploading ? 'wait' : 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            <HiOutlinePhotograph size={15} />
            {uploading ? 'Envoi…' : imageUrl ? "Changer l'image" : "Ajouter l'image"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
        </>
      )}
    </div>
  );
};

export default CatalogueBanner;
