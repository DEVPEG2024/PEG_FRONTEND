import { useRef } from 'react';
import { BannerConfig } from '../types';
import { HiOutlinePhotograph, HiOutlineX, HiOutlinePencil } from 'react-icons/hi';

type Props = {
  banner: BannerConfig;
  onChange: (banner: BannerConfig) => void;
};

export default function BannerSection({ banner, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) =>
      onChange({ ...banner, imageDataUrl: ev.target?.result as string });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div
      style={{
        marginBottom: '16px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '14px',
        overflow: 'hidden',
      }}
    >
      {/* Header label */}
      <div
        style={{
          padding: '10px 14px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            color: 'rgba(255,255,255,0.25)',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Bannière du formulaire
        </span>
      </div>

      {/* Image zone */}
      {banner.imageDataUrl ? (
        <div style={{ position: 'relative', margin: '10px 14px 0' }}>
          <img
            src={banner.imageDataUrl}
            alt="Bannière"
            style={{
              width: '100%',
              maxHeight: '180px',
              objectFit: 'cover',
              display: 'block',
              borderRadius: '10px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              display: 'flex',
              gap: '6px',
            }}
          >
            <button
              onClick={() => fileRef.current?.click()}
              style={iconBtnStyle}
              title="Remplacer l'image"
            >
              <HiOutlinePencil size={13} />
            </button>
            <button
              onClick={() => onChange({ ...banner, imageDataUrl: undefined })}
              style={{ ...iconBtnStyle, background: 'rgba(220,38,38,0.75)' }}
              title="Supprimer l'image"
            >
              <HiOutlineX size={13} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            width: 'calc(100% - 28px)',
            margin: '10px 14px 0',
            padding: '20px 0',
            background: 'rgba(255,255,255,0.03)',
            border: '1.5px dashed rgba(255,255,255,0.1)',
            borderRadius: '10px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            color: 'rgba(255,255,255,0.25)',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.borderColor = 'rgba(47,111,237,0.4)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')
          }
        >
          <HiOutlinePhotograph size={26} />
          <span style={{ fontSize: '12px', fontWeight: 600 }}>
            Ajouter une image de bannière
          </span>
          <span style={{ fontSize: '11px', opacity: 0.7 }}>
            JPG, PNG, WebP — cliquez pour importer
          </span>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      {/* Title & subtitle */}
      <div
        style={{
          padding: '12px 14px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <input
          type="text"
          placeholder="Titre du formulaire (optionnel)"
          value={banner.title ?? ''}
          onChange={(e) => onChange({ ...banner, title: e.target.value })}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Sous-titre (optionnel)"
          value={banner.subtitle ?? ''}
          onChange={(e) => onChange({ ...banner, subtitle: e.target.value })}
          style={{ ...inputStyle, color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}
        />
      </div>
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '8px',
  background: 'rgba(0,0,0,0.55)',
  border: 'none',
  cursor: 'pointer',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backdropFilter: 'blur(6px)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: '8px',
  padding: '8px 12px',
  color: '#fff',
  fontSize: '13px',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
};
