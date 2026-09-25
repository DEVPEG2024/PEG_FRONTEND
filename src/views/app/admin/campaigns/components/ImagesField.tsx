import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { HiChevronLeft, HiChevronRight, HiOutlinePhotograph, HiX } from 'react-icons/hi';
import type { CampaignImage } from '@/@types/campaign';
import { apiUploadFile } from '@/services/FileServices';
import { LIMITS } from '@/utils/campaignFormat';
import { hintStyle } from '../ui';

/**
 * Photos de la campagne : envoi vers la médiathèque Strapi (S3), la première
 * sert de couverture. Réordonnables, 6 au plus.
 */

const MAX_BYTES = 15 * 1024 * 1024;

const tileBtn: React.CSSProperties = {
  width: '26px', height: '26px', borderRadius: '50%', border: 'none', cursor: 'pointer',
  background: 'rgba(15,23,42,0.8)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
};

const ImagesField = ({ images, onChange }: { images: CampaignImage[]; onChange: (images: CampaignImage[]) => void }) => {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const addFiles = async (files: File[]) => {
    const room = LIMITS.images - imagesRef.current.length - uploading;
    const picked = files.filter((f) => f.type.startsWith('image/'));
    if (picked.length < files.length) toast.warning('Seules les images sont acceptées.');
    const tooBig = picked.filter((f) => f.size > MAX_BYTES);
    if (tooBig.length) toast.warning(`${tooBig.length} photo(s) de plus de 15 Mo ignorée(s).`);
    const queue = picked.filter((f) => f.size <= MAX_BYTES).slice(0, Math.max(0, room));
    if (picked.length > room) toast.info(`${LIMITS.images} photos au maximum.`);
    if (!queue.length) return;

    setUploading((n) => n + queue.length);
    for (const file of queue) {
      try {
        const up = await apiUploadFile(file);
        if (!/^https:\/\//.test(up?.url || '')) throw new Error('adresse non sécurisée');
        const img: CampaignImage = {
          id: Number(up.id) || null,
          url: up.url,
          width: up.width ?? null,
          height: up.height ?? null,
          name: up.name || file.name,
        };
        onChange([...imagesRef.current, img]);
      } catch (e: any) {
        toast.error(`« ${file.name} » n’a pas pu être envoyée${e?.message ? ` (${e.message})` : ''}.`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const move = (i: number, delta: number) => {
    const next = [...images];
    const j = i + delta;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const full = images.length + uploading >= LIMITS.images;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: '8px' }}>
        {images.map((img, i) => (
          <div key={`${img.url}-${i}`} style={{ position: 'relative', aspectRatio: '4 / 3', borderRadius: '10px', overflow: 'hidden', background: '#0b1422', border: `1px solid ${i === 0 ? 'rgba(96,165,250,0.6)' : 'rgba(255,255,255,0.1)'}` }}>
            <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            {i === 0 && (
              <span style={{ position: 'absolute', left: '6px', bottom: '6px', background: 'rgba(37,99,235,0.9)', color: '#fff', fontSize: '10px', fontWeight: 700, borderRadius: '100px', padding: '1px 7px' }}>
                Couverture
              </span>
            )}
            <div style={{ position: 'absolute', top: '5px', right: '5px', display: 'flex', gap: '4px' }}>
              {i > 0 && <button type="button" style={tileBtn} onClick={() => move(i, -1)} aria-label="Avancer la photo"><HiChevronLeft size={15} /></button>}
              {i < images.length - 1 && <button type="button" style={tileBtn} onClick={() => move(i, 1)} aria-label="Reculer la photo"><HiChevronRight size={15} /></button>}
              <button type="button" style={tileBtn} onClick={() => onChange(images.filter((_, k) => k !== i))} aria-label="Retirer la photo"><HiX size={14} /></button>
            </div>
          </div>
        ))}
        {Array.from({ length: uploading }).map((_, i) => (
          <div key={`up-${i}`} style={{ aspectRatio: '4 / 3', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
            Envoi…
          </div>
        ))}
        {!full && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(Array.from(e.dataTransfer.files || [])); }}
            style={{
              aspectRatio: '4 / 3', borderRadius: '10px', cursor: 'pointer',
              background: dragOver ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px dashed ${dragOver ? 'rgba(96,165,250,0.7)' : 'rgba(255,255,255,0.2)'}`,
              color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
            }}
          >
            <HiOutlinePhotograph size={22} />
            Ajouter
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => { addFiles(Array.from(e.target.files || [])); e.target.value = ''; }}
      />
      <span style={hintStyle}>
        Jusqu’à {LIMITS.images} photos, glisser-déposer possible. La première sert de couverture (format conseillé 1200 × 630) ; elles ne sont jamais rognées.
      </span>
    </div>
  );
};

export default ImagesField;
