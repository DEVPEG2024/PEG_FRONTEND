import { useEffect, useRef, useState } from 'react';
import { HiOutlinePhotograph, HiOutlineSearch, HiOutlineTag, HiOutlineCube } from 'react-icons/hi';
import type { CampaignCategoryOption, CampaignProductOption } from '@/@types/campaign';
import { apiGetCampaignCategories, apiGetCampaignProduct, apiSearchCampaignProducts } from '@/services/CampaignServices';
import { btn, hintStyle, inputStyle } from '../ui';

/**
 * Destination du bouton d'action : un produit précis (fiche produit client) ou
 * une catégorie du catalogue. Le lien enregistré est un chemin interne
 * (/customer/product/:id, /customer/catalogue/categories/:id).
 */

const Thumb = ({ url, icon }: { url: string | null; icon: React.ReactNode }) => (
  <span style={{ width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden', background: 'rgba(255,255,255,0.06)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>
    {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : icon}
  </span>
);

const Badge = ({ p }: { p: CampaignProductOption }) =>
  p.inCatalogue ? (
    <span style={{ fontSize: '10px', fontWeight: 700, color: '#4ade80', background: 'rgba(74,222,128,0.12)', borderRadius: '100px', padding: '1px 7px', whiteSpace: 'nowrap' }}>Catalogue</span>
  ) : (
    <span style={{ fontSize: '10px', fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.12)', borderRadius: '100px', padding: '1px 7px', whiteSpace: 'nowrap' }}>Offre dédiée</span>
  );

type ProductProps = {
  selectedId: string | null;
  onPick: (p: CampaignProductOption) => void;
  /** Ajoute la photo du produit à la campagne (null si déjà présente ou pas de photo). */
  onUsePhoto: ((p: CampaignProductOption) => void) | null;
  hasPhoto: (url: string) => boolean;
};

export const ProductPicker = ({ selectedId, onPick, onUsePhoto, hasPhoto }: ProductProps) => {
  const [selected, setSelected] = useState<CampaignProductOption | null>(null);
  const [searching, setSearching] = useState(!selectedId);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<CampaignProductOption[] | null>(null);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Campagne rouverte : on retrouve le produit enregistré.
  useEffect(() => {
    if (!selectedId || selected?.documentId === selectedId) return;
    apiGetCampaignProduct(selectedId)
      .then((p) => { setSelected(p); if (!p) setSearching(true); })
      .catch(() => setSearching(true));
  }, [selectedId, selected?.documentId]);

  // Recherche serveur, après une pause de frappe.
  useEffect(() => {
    if (!searching) return;
    const t = setTimeout(() => {
      apiSearchCampaignProducts(q.trim())
        .then((list) => { setResults(list); setError(false); })
        .catch(() => { setResults([]); setError(true); });
    }, 300);
    return () => clearTimeout(t);
  }, [q, searching]);

  useEffect(() => { if (searching) inputRef.current?.focus(); }, [searching]);

  if (selected && !searching) {
    const photoAvailable = !!selected.imageUrl && !hasPhoto(selected.imageUrl) && !!onUsePhoto;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.35)', borderRadius: '12px', padding: '8px 10px' }}>
          <Thumb url={selected.imageUrl} icon={<HiOutlineCube size={20} />} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.name}</div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
              <Badge p={selected} />
              {selected.categoryName && <span style={{ ...hintStyle, fontSize: '11px' }}>{selected.categoryName}</span>}
            </div>
          </div>
          <button type="button" style={{ ...btn('rgba(255,255,255,0.7)'), padding: '6px 10px', fontSize: '12px' }} onClick={() => setSearching(true)}>
            Changer
          </button>
        </div>
        {selected.restricted && (
          <span style={{ ...hintStyle, color: '#fde68a' }}>
            Offre dédiée : ce produit n’est pas au catalogue. Ciblez les clients auxquels il est attribué.
          </span>
        )}
        {photoAvailable && (
          <button type="button" style={{ ...btn('#60a5fa'), alignSelf: 'flex-start', padding: '6px 10px', fontSize: '12px' }} onClick={() => onUsePhoto!(selected)}>
            <HiOutlinePhotograph size={14} /> Ajouter la photo du produit à la campagne
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ position: 'relative' }}>
        <HiOutlineSearch size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un produit"
          aria-label="Rechercher un produit"
          style={{ ...inputStyle, padding: '9px 10px 9px 30px', fontSize: '13px' }}
        />
      </div>
      <div style={{ maxHeight: '260px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
        {results === null ? (
          <div style={{ ...hintStyle, padding: '12px' }}>Recherche…</div>
        ) : error ? (
          <div style={{ ...hintStyle, padding: '12px', color: '#fca5a5' }}>Produits indisponibles pour le moment.</div>
        ) : results.length === 0 ? (
          <div style={{ ...hintStyle, padding: '12px' }}>Aucun produit visible des clients ne correspond.</div>
        ) : (
          results.map((p) => (
            <button
              key={p.documentId}
              type="button"
              onClick={() => { setSelected(p); setSearching(false); onPick(p); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 10px', cursor: 'pointer', textAlign: 'left',
                background: p.documentId === selectedId ? 'rgba(96,165,250,0.1)' : 'transparent',
                border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: 'Inter, sans-serif',
              }}
            >
              <Thumb url={p.imageUrl} icon={<HiOutlineCube size={18} />} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', color: '#fff', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                {p.categoryName && <span style={{ ...hintStyle, fontSize: '11px' }}>{p.categoryName}</span>}
              </span>
              <Badge p={p} />
            </button>
          ))
        )}
      </div>
      {selected && (
        <button type="button" style={{ ...btn('rgba(255,255,255,0.6)'), alignSelf: 'flex-start', padding: '5px 10px', fontSize: '12px' }} onClick={() => setSearching(false)}>
          Garder « {selected.name} »
        </button>
      )}
    </div>
  );
};

export const CategoryPicker = ({ selectedId, onPick }: { selectedId: string | null; onPick: (c: CampaignCategoryOption) => void }) => {
  const [list, setList] = useState<CampaignCategoryOption[] | null>(null);
  useEffect(() => {
    apiGetCampaignCategories().then(setList).catch(() => setList([]));
  }, []);
  const current = list?.find((c) => c.documentId === selectedId) || null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <Thumb url={current?.imageUrl || null} icon={<HiOutlineTag size={18} />} />
      <select
        value={selectedId || ''}
        onChange={(e) => { const c = list?.find((x) => x.documentId === e.target.value); if (c) onPick(c); }}
        disabled={!list}
        aria-label="Catégorie du catalogue"
        style={{ ...inputStyle, appearance: 'auto', flex: 1 }}
      >
        <option value="" disabled style={{ color: '#000' }}>{list ? 'Choisir une catégorie…' : 'Chargement…'}</option>
        {(list || []).map((c) => <option key={c.documentId} value={c.documentId} style={{ color: '#000' }}>{c.name}</option>)}
      </select>
    </div>
  );
};
