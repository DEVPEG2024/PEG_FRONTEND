// Bannière de l'espace client, modifiable directement depuis l'onglet Premium :
// image ordinateur et image téléphone. Écrit la bannière PROPRE du client
// (customer.banner) — créée à la volée s'il n'en a pas encore.
import { ReactNode, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { TbDeviceDesktop, TbDeviceMobile, TbPhotoUp, TbTrash } from 'react-icons/tb';
import { apiUploadFile } from '@/services/FileServices';
import {
  apiSetCustomerBannerImage,
  BannerSlot,
  CustomerBanner,
  isBannerMobileSupported,
} from '@/services/BannerServices';
import { MOBILE_BANNER_FORMAT, MOBILE_BANNER_HEIGHT, MOBILE_BANNER_WIDTH } from '@/utils/bannerVisual';

const MAX_SIZE = 5 * 1024 * 1024;

const SLOTS: Record<BannerSlot, {
  label: string;
  icon: ReactNode;
  thumbWidth: string;
  thumbRatio: string;
  empty: string;
}> = {
  image: {
    label: 'Ordinateur',
    icon: <TbDeviceDesktop size={13} />,
    thumbWidth: '150px',
    // Bannière client type : 2836 × 442
    thumbRatio: '2836 / 442',
    empty: 'Bannière par défaut (catégorie ou NEW CUSTOMER)',
  },
  mobileImage: {
    label: 'Téléphone',
    icon: <TbDeviceMobile size={13} />,
    thumbWidth: '72px',
    thumbRatio: `${MOBILE_BANNER_WIDTH} / ${MOBILE_BANNER_HEIGHT}`,
    empty: "Image ordinateur, affichée en entier",
  },
};

const PremiumBannerEditor = ({
  customerDocumentId,
  customerName,
  banner,
  onChange,
}: {
  customerDocumentId: string;
  customerName: string;
  banner?: CustomerBanner | null;
  onChange: (banner: CustomerBanner) => void;
}) => {
  const [busySlot, setBusySlot] = useState<BannerSlot | null>(null);
  const inputs = {
    image: useRef<HTMLInputElement>(null),
    mobileImage: useRef<HTMLInputElement>(null),
  };
  const slots: BannerSlot[] = isBannerMobileSupported() ? ['image', 'mobileImage'] : ['image'];

  const write = async (slot: BannerSlot, fileId: string | null) => {
    setBusySlot(slot);
    try {
      const updated = await apiSetCustomerBannerImage({
        customerDocumentId,
        customerName,
        bannerDocumentId: banner?.documentId,
        slot,
        fileId,
      });
      onChange(updated);
      toast.success(fileId ? `Bannière ${SLOTS[slot].label.toLowerCase()} mise à jour` : 'Image téléphone retirée');
    } catch {
      toast.error("Échec de l'enregistrement de la bannière");
    } finally {
      setBusySlot(null);
    }
  };

  const onFile = async (slot: BannerSlot, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_SIZE) {
      toast.error('Image trop lourde (max 5 Mo)');
      return;
    }
    setBusySlot(slot);
    try {
      const uploaded = await apiUploadFile(file);
      await write(slot, uploaded.id);
    } catch {
      toast.error("Échec de l'envoi de l'image");
      setBusySlot(null);
    }
  };

  return (
    <div style={{
      flexBasis: '100%', display: 'flex', flexDirection: 'column', gap: '10px',
      borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px',
    }}>
      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Bannière de l'espace client
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 22px' }}>
        {slots.map((slot) => {
          const cfg = SLOTS[slot];
          const url = banner?.[slot]?.url;
          const busy = busySlot === slot;
          return (
            <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div style={{
                width: cfg.thumbWidth, aspectRatio: cfg.thumbRatio, flexShrink: 0,
                borderRadius: '6px', overflow: 'hidden',
                background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {url
                  ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <span style={{ color: 'rgba(255,255,255,0.25)', display: 'flex' }}>{cfg.icon}</span>}
              </div>
              <div style={{ minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fff', fontSize: '12px', fontWeight: 700 }}>
                  {cfg.icon} {cfg.label}
                </span>
                <span style={{ display: 'block', color: 'rgba(255,255,255,0.45)', fontSize: '11px', margin: '1px 0 5px' }}>
                  {url ? 'Image propre au client' : cfg.empty}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => inputs[slot].current?.click()}
                    disabled={busySlot !== null}
                    className="peg-tap-target"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)',
                      borderRadius: '8px', padding: '5px 10px', color: '#eab308',
                      fontSize: '11.5px', fontWeight: 700, fontFamily: 'Inter, sans-serif',
                      cursor: busySlot ? 'wait' : 'pointer',
                    }}
                  >
                    <TbPhotoUp size={13} />
                    {busy ? 'Envoi…' : url ? 'Changer' : 'Ajouter'}
                  </button>
                  {slot === 'mobileImage' && url && (
                    <button
                      type="button"
                      onClick={() => write('mobileImage', null)}
                      disabled={busySlot !== null}
                      className="peg-tap-target"
                      aria-label="Retirer l'image téléphone"
                      title="Retirer l'image téléphone"
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
                        borderRadius: '8px', padding: '5px 8px', color: '#f87171',
                        cursor: busySlot ? 'wait' : 'pointer',
                      }}
                    >
                      <TbTrash size={13} />
                    </button>
                  )}
                </div>
                <input
                  ref={inputs[slot]}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => onFile(slot, e)}
                />
              </div>
            </div>
          );
        })}
      </div>
      {slots.includes('mobileImage') && (
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', lineHeight: 1.5 }}>
          Format téléphone conseillé : {MOBILE_BANNER_FORMAT} — trois fois plus haut que la bannière ordinateur.
        </span>
      )}
    </div>
  );
};

export default PremiumBannerEditor;
