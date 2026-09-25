import { useMemo, useState } from 'react';
import { HiCheck, HiOutlineSearch, HiOutlineUserGroup } from 'react-icons/hi';
import { TbCrown } from 'react-icons/tb';
import type { AudienceDirectory, AudiencePreview, AudienceType, CampaignAudience, PremiumFilter } from '@/@types/campaign';
import { fmtInt } from '@/utils/campaignFormat';
import { chip, hintStyle, inputStyle, labelStyle } from '../ui';

/**
 * Destinataires : tous les clients, un segment (Premium / Standard × secteurs)
 * ou une sélection manuelle. Le compteur est calculé par le serveur (mêmes
 * règles que l'envoi : comptes clients actifs, désinscrits des e-mails exclus).
 */

type Props = {
  audience: CampaignAudience;
  onChange: (a: CampaignAudience) => void;
  directory: AudienceDirectory | null;
  preview: AudiencePreview | null;
  previewLoading: boolean;
  channelEmail: boolean;
};

const MODES: { type: AudienceType; title: string; text: string }[] = [
  { type: 'all', title: 'Tous les clients', text: 'Chaque compte client actif' },
  { type: 'segment', title: 'Un segment', text: 'Premium / Standard, par secteur' },
  { type: 'selection', title: 'Une sélection', text: 'Clients choisis un par un' },
];

const PREMIUM: { value: PremiumFilter; label: string }[] = [
  { value: 'any', label: 'Premium et Standard' },
  { value: 'premium', label: 'Premium' },
  { value: 'standard', label: 'Standard' },
];

const AudiencePicker = ({ audience, onChange, directory, preview, previewLoading, channelEmail }: Props) => {
  const [search, setSearch] = useState('');
  const set = (patch: Partial<CampaignAudience>) => onChange({ ...audience, ...patch });

  const selected = useMemo(() => new Set(audience.customers), [audience.customers]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = directory?.customers || [];
    return q ? list.filter((c) => `${c.name} ${c.categoryName}`.toLowerCase().includes(q)) : list;
  }, [directory, search]);

  const toggleCustomer = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    set({ customers: Array.from(next) });
  };
  const toggleCategory = (id: string) => {
    const next = new Set(audience.categories);
    if (next.has(id)) next.delete(id); else next.add(id);
    set({ categories: Array.from(next) });
  };
  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.documentId));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {audience.type === 'users' ? (
        <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.35)', borderRadius: '12px', padding: '12px 14px' }}>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{audience.label || `${audience.users.length} comptes`}</div>
          <div style={{ ...hintStyle, marginTop: '4px' }}>
            Relance ciblée sur les comptes qui n’avaient pas ouvert la campagne d’origine.{' '}
            <button type="button" onClick={() => onChange({ ...audience, type: 'all', users: [], label: '' })} style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', padding: 0, fontSize: '12px', textDecoration: 'underline' }}>
              Cibler autrement
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
          {MODES.map((m) => {
            const on = audience.type === m.type;
            return (
              <button
                key={m.type}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ ...audience, type: m.type, label: '' })}
                style={{
                  textAlign: 'left', cursor: 'pointer', borderRadius: '12px', padding: '10px 12px', fontFamily: 'Inter, sans-serif',
                  background: on ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${on ? 'rgba(96,165,250,0.55)' : 'rgba(255,255,255,0.1)'}`,
                }}
              >
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {on && <HiCheck size={14} color="#60a5fa" />} {m.title}
                </div>
                <div style={{ ...hintStyle, marginTop: '2px' }}>{m.text}</div>
              </button>
            );
          })}
        </div>
      )}

      {audience.type === 'segment' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <div style={{ ...labelStyle, marginBottom: '6px' }}>Formule</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {PREMIUM.map((p) => (
                <button key={p.value} type="button" style={chip(audience.premium === p.value, '#fbbf24')} onClick={() => set({ premium: p.value })}>
                  {p.value === 'premium' && <TbCrown size={13} />} {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ ...labelStyle, marginBottom: '6px' }}>Secteurs {audience.categories.length ? `(${audience.categories.length})` : '— tous'}</div>
            {!directory ? (
              <span style={hintStyle}>Chargement des secteurs…</span>
            ) : directory.categories.length === 0 ? (
              <span style={hintStyle}>Aucun secteur défini.</span>
            ) : (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {directory.categories.map((c) => (
                  <button key={c.documentId} type="button" style={chip(audience.categories.includes(c.documentId), '#a78bfa')} onClick={() => toggleCategory(c.documentId)}>
                    {c.name} <span style={{ opacity: 0.6 }}>{c.customers}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {audience.type === 'selection' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <HiOutlineSearch size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un client ou un secteur" aria-label="Rechercher un client" style={{ ...inputStyle, padding: '8px 10px 8px 30px', fontSize: '13px' }} />
            </div>
            <button
              type="button"
              style={chip(false)}
              disabled={!filtered.length}
              onClick={() => {
                const next = new Set(selected);
                filtered.forEach((c) => (allFilteredSelected ? next.delete(c.documentId) : next.add(c.documentId)));
                set({ customers: Array.from(next) });
              }}
            >
              {allFilteredSelected ? 'Tout décocher' : `Tout cocher (${filtered.length})`}
            </button>
            {selected.size > 0 && (
              <button type="button" style={chip(false)} onClick={() => set({ customers: [] })}>Vider</button>
            )}
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
            {!directory ? (
              <div style={{ ...hintStyle, padding: '12px' }}>Chargement des clients…</div>
            ) : filtered.length === 0 ? (
              <div style={{ ...hintStyle, padding: '12px' }}>Aucun client ne correspond.</div>
            ) : (
              filtered.map((c) => {
                const on = selected.has(c.documentId);
                return (
                  <label
                    key={c.documentId}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.05)', background: on ? 'rgba(96,165,250,0.08)' : 'transparent',
                    }}
                  >
                    <input type="checkbox" checked={on} onChange={() => toggleCustomer(c.documentId)} style={{ accentColor: '#3b82f6', width: '16px', height: '16px', flexShrink: 0 }} />
                    <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    {c.premium && <TbCrown size={14} color="#fbbf24" title="Premium" />}
                    {c.categoryName && <span style={{ ...hintStyle, whiteSpace: 'nowrap' }}>{c.categoryName}</span>}
                    <span style={{ ...hintStyle, whiteSpace: 'nowrap', minWidth: '52px', textAlign: 'right', color: c.users ? 'rgba(255,255,255,0.45)' : '#f87171' }}>
                      {c.users ? `${c.users} compte${c.users > 1 ? 's' : ''}` : 'aucun compte'}
                    </span>
                  </label>
                );
              })
            )}
          </div>
          <span style={hintStyle}>{selected.size} client{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Compteur calculé par le serveur */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.22)', borderRadius: '12px', padding: '12px 14px', opacity: previewLoading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
        <HiOutlineUserGroup size={22} color="#60a5fa" style={{ flexShrink: 0 }} />
        {preview ? (
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>
              {fmtInt(preview.customers)} client{preview.customers > 1 ? 's' : ''} · {fmtInt(preview.users)} compte{preview.users > 1 ? 's' : ''} destinataire{preview.users > 1 ? 's' : ''}
            </div>
            <div style={hintStyle}>
              {channelEmail
                ? `${fmtInt(preview.emails)} e-mail${preview.emails > 1 ? 's' : ''} envoyé${preview.emails > 1 ? 's' : ''}${preview.optouts ? ` · ${preview.optouts} désinscrit${preview.optouts > 1 ? 's' : ''}` : ''}${preview.noEmail ? ` · ${preview.noEmail} sans adresse` : ''}`
                : preview.sample.length ? `Dont ${preview.sample.join(', ')}${preview.customers > preview.sample.length ? '…' : ''}` : 'Aucun client ne correspond à ce ciblage.'}
            </div>
          </div>
        ) : (
          <span style={hintStyle}>Calcul des destinataires…</span>
        )}
      </div>
    </div>
  );
};

export default AudiencePicker;
