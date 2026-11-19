/*
 * Recherche d'un produit dans le catalogue Master Print (2 300 modèles textile,
 * grand format, adhésifs, PLV). Master Print n'a pas de recherche : le serveur
 * PEG garde la liste et cherche dans le nom, la marque et la référence.
 */
import { useEffect, useRef, useState } from 'react';
import { HiSearch } from 'react-icons/hi';
import type { MpCatalogItem } from '@/@types/masterPrint';
import { apiSearchMasterPrintCatalog } from '@/services/MasterPrintServices';
import { masterPrintError } from '@/utils/masterPrint';
import { Btn, input, muted } from './ui';

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tout le catalogue' },
  { value: 'textile', label: 'Textile' },
  { value: 'dtf', label: 'Transferts DTF' },
  { value: 'large-format', label: 'Grand format' },
  { value: 'stickers', label: 'Adhésifs et stickers' },
  { value: 'displays', label: 'Supports et PLV' },
];

type Props = {
  initialQuery?: string;
  onPick: (item: MpCatalogItem) => void;
  onClose: () => void;
};

const ProductPicker = ({ initialQuery = '', onPick, onClose }: Props) => {
  const [q, setQ] = useState(initialQuery);
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<MpCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const id = ++seq.current;
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiSearchMasterPrintCatalog(
          q.trim(),
          category || undefined
        );
        if (id === seq.current) setResults(data.results || []);
      } catch (e) {
        if (id === seq.current)
          setError(masterPrintError(e, 'Catalogue Master Print indisponible.'));
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, category]);

  return (
    <div
      style={{
        marginTop: '10px',
        padding: '12px',
        borderRadius: '12px',
        background: 'rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <HiSearch
            style={{ position: 'absolute', left: 10, top: 11, opacity: 0.5 }}
            aria-hidden="true"
          />
          <input
            autoFocus
            style={{ ...input, paddingLeft: '30px' }}
            placeholder="Nom, marque ou référence (ex. TU01T, polo, roll-up)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Rechercher un produit Master Print"
          />
        </div>
        <select
          style={{ ...input, width: 'auto', flex: '0 1 200px' }}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Famille de produits"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <Btn onClick={onClose}>Fermer</Btn>
      </div>
      {error && (
        <p style={{ ...muted, color: '#fca5a5', marginTop: '8px' }}>{error}</p>
      )}
      <div
        style={{
          marginTop: '8px',
          maxHeight: '280px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {loading && !results.length && <p style={muted}>Recherche…</p>}
        {!loading && !error && !results.length && (
          <p style={muted}>Aucun produit ne correspond.</p>
        )}
        {results.map((r) => (
          <button
            key={r.id}
            type="button"
            className="peg-tap-target"
            onClick={() => onPick(r)}
            style={{
              textAlign: 'left',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.03)',
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
            }}
          >
            <strong style={{ fontWeight: 600 }}>{r.name}</strong>
            <span style={{ ...muted, marginLeft: '8px' }}>
              {[
                r.brand,
                r.sku ? `réf. ${r.sku}` : null,
                r.bestSellerRank ? `n° ${r.bestSellerRank} des ventes` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProductPicker;
