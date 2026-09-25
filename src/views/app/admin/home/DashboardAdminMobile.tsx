/**
 * Tableau de bord admin — rendu TÉLÉPHONE uniquement (< md), style « app de
 * paiement » (demande explicite du 25/09/2026) : solde en grand, tuiles vitrées,
 * raccourcis ronds, liste façon transactions, accent vert citron sur fond noir.
 *
 * Composant d'AFFICHAGE seulement : aucun calcul ici. DashboardAdmin (protégé)
 * calcule CA, encaissé, marges… et passe les valeurs déjà formatées avec leurs
 * libellés actuels — le calcul du CA et les libellés restent à un seul endroit.
 * Bannière admin, masquage des chiffres, pense-bête et widgets sont conservés.
 * Couleur du dégradé au choix (bouton palette), mémorisée sur l'appareil.
 */
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineRefresh,
  HiOutlinePhotograph,
  HiOutlineDocumentDuplicate,
  HiOutlineCube,
  HiOutlineChevronRight,
  HiOutlineColorSwatch,
} from 'react-icons/hi';

export type MobileTile = {
  key: string;
  label: string;
  value: string;
  sub?: ReactNode;
  icon: ReactNode;
  tone?: 'lime' | 'amber' | 'rose' | 'mint' | 'sky';
  onClick?: () => void;
};

export type MobileStat = {
  key: string;
  label: string;
  value: string;
  icon: ReactNode;
  alert?: boolean;
  onClick?: () => void;
};

export type MobileActivity = {
  left: string;
  right: string;
  sub?: string;
  type?: 'invoice' | 'project';
};

type Props = {
  greeting: string;
  status: string;
  bannerUrl: string;
  onPickBanner: () => void;
  hidePrices: boolean;
  onTogglePrices: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  error: string | null;
  dataReady: boolean;
  balance: {
    label: string;
    value: string;
    sub: string;
    delta?: ReactNode;
    deltaNote?: string;
  };
  tiles: MobileTile[];
  stats: MobileStat[];
  /** null : widget « Activité récente » masqué par l'admin */
  activity: { title: string; subtitle: string; items: MobileActivity[] } | null;
  widgets: { id: string; content: ReactNode }[];
};

const CSS = `
.pdm {
  --pdm-text: #f3f7ec;
  --pdm-muted: rgba(232, 242, 220, 0.55);
  --pdm-faint: rgba(232, 242, 220, 0.32);
  --pdm-card: rgba(255, 255, 255, 0.045);
  --pdm-line: rgba(255, 255, 255, 0.08);
  position: relative;
  min-height: calc(100dvh - 64px);
  padding: 18px 16px 28px;
  color: var(--pdm-text);
  font-family: Inter, sans-serif;
  background:
    radial-gradient(130% 60% at 100% 0%, rgba(var(--pdm-accent-rgb), 0.30) 0%, rgba(var(--pdm-accent-rgb), 0.10) 40%, transparent 70%),
    radial-gradient(90% 40% at 0% 30%, rgba(var(--pdm-accent-rgb), 0.06) 0%, transparent 60%),
    #070a08;
  overflow: hidden;
}
.pdm-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.pdm-hello { min-width: 0; }
.pdm-hello h1 { margin: 0; font-size: 17px; font-weight: 700; letter-spacing: -0.01em; color: var(--pdm-text); }
.pdm-hello p { margin: 3px 0 0; font-size: 12px; color: var(--pdm-muted); text-transform: none; }
.pdm-icons { display: flex; gap: 6px; flex-shrink: 0; }
.pdm-icon-btn {
  width: 38px; height: 38px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.06); border: 1px solid var(--pdm-line);
  color: var(--pdm-text); font-size: 18px; cursor: pointer;
}
.pdm-icon-btn.is-on { color: var(--pdm-on-accent); background: var(--pdm-accent); border-color: transparent; }
.pdm-icon-btn:active { transform: scale(0.94); }
.pdm-spin { animation: pdm-spin 0.9s linear infinite; }
@keyframes pdm-spin { to { transform: rotate(360deg); } }

.pdm-balance {
  position: relative; margin: 22px -16px 0; padding: 26px 16px 28px;
  text-align: center; overflow: hidden;
}
.pdm-balance-bg {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
  opacity: 0.22; filter: saturate(0.8);
  -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 30%, #000 60%, transparent 100%);
  mask-image: linear-gradient(180deg, transparent 0%, #000 30%, #000 60%, transparent 100%);
  pointer-events: none;
}
.pdm-balance > *:not(.pdm-balance-bg) { position: relative; }
.pdm-balance-label {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 12.5px; color: var(--pdm-muted); letter-spacing: 0.02em;
}
.pdm-balance-value {
  margin-top: 8px; font-size: 44px; line-height: 1.05; font-weight: 800;
  letter-spacing: -0.03em; color: #fff; font-variant-numeric: tabular-nums;
  text-shadow: 0 0 40px rgba(var(--pdm-accent-rgb), 0.18);
}
.pdm-balance-sub {
  margin-top: 8px; display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: center;
  font-size: 12.5px; color: var(--pdm-muted);
}
.pdm-eye {
  position: relative; width: 36px; height: 36px; border-radius: 50%; border: 0; background: rgba(255, 255, 255, 0.06);
  color: var(--pdm-accent); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; font-size: 17px;
}
.pdm-eye::after { content: ''; position: absolute; inset: -4px; }

.pdm-tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 6px; }
.pdm-tile {
  position: relative; text-align: left; border-radius: 22px; padding: 14px 14px 15px;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.075) 0%, rgba(255, 255, 255, 0.025) 100%);
  border: 1px solid var(--pdm-line); color: var(--pdm-text);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  display: flex; flex-direction: column; gap: 10px; min-width: 0;
}
button.pdm-tile { cursor: pointer; font: inherit; }
button.pdm-tile:active { transform: scale(0.98); }
.pdm-tile-icon {
  width: 36px; height: 36px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;
  font-size: 18px; color: var(--pdm-accent); background: rgba(var(--pdm-accent-rgb), 0.10);
  border: 1px solid rgba(var(--pdm-accent-rgb), 0.22);
}
.pdm-tile[data-tone="amber"] .pdm-tile-icon { color: #fbbf24; background: rgba(251, 191, 36, 0.10); border-color: rgba(251, 191, 36, 0.25); }
.pdm-tile[data-tone="rose"] .pdm-tile-icon { color: #fb7185; background: rgba(251, 113, 133, 0.10); border-color: rgba(251, 113, 133, 0.25); }
.pdm-tile[data-tone="mint"] .pdm-tile-icon { color: #5eead4; background: rgba(94, 234, 212, 0.10); border-color: rgba(94, 234, 212, 0.25); }
.pdm-tile[data-tone="sky"] .pdm-tile-icon { color: #7dd3fc; background: rgba(125, 211, 252, 0.10); border-color: rgba(125, 211, 252, 0.25); }
.pdm-tile-label { font-size: 12px; color: var(--pdm-muted); line-height: 1.25; }
.pdm-tile-value { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pdm-tile-sub { font-size: 11px; color: var(--pdm-faint); margin-top: -6px; }
.pdm-tile-go { position: absolute; top: 16px; right: 12px; color: var(--pdm-faint); font-size: 16px; }

.pdm-section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin: 26px 0 12px; }
.pdm-section-head h2 { margin: 0; font-size: 15px; font-weight: 700; color: var(--pdm-text); letter-spacing: -0.01em; }
.pdm-section-head span { font-size: 11.5px; color: var(--pdm-faint); }

.pdm-stats {
  display: flex; gap: 14px; overflow-x: auto; margin: 0 -16px; padding: 2px 16px 4px;
  scrollbar-width: none; -webkit-overflow-scrolling: touch;
}
.pdm-stats::-webkit-scrollbar { display: none; }
.pdm-stat {
  flex: 0 0 auto; width: 70px; display: flex; flex-direction: column; align-items: center; gap: 7px;
  background: none; border: 0; padding: 0; color: var(--pdm-text); font: inherit; cursor: pointer; text-align: center;
}
.pdm-stat-ring {
  position: relative; width: 58px; height: 58px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.03) 70%);
  border: 1.5px solid rgba(var(--pdm-accent-rgb), 0.35);
  box-shadow: 0 0 18px rgba(var(--pdm-accent-rgb), 0.10);
  font-size: 15px; font-weight: 800; color: #fff; font-variant-numeric: tabular-nums;
}
.pdm-stat.is-alert .pdm-stat-ring { border-color: rgba(251, 113, 133, 0.6); box-shadow: 0 0 18px rgba(251, 113, 133, 0.18); }
.pdm-stat-icon {
  position: absolute; right: -2px; bottom: -2px; width: 22px; height: 22px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: 12px;
  background: var(--pdm-accent); color: var(--pdm-on-accent); border: 2px solid #070a08;
}
.pdm-stat.is-alert .pdm-stat-icon { background: #fb7185; color: #2a0a10; }
.pdm-stat-label { font-size: 11px; line-height: 1.2; color: var(--pdm-muted); }

.pdm-list { border-radius: 22px; background: var(--pdm-card); border: 1px solid var(--pdm-line); padding: 4px 14px; }
.pdm-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
.pdm-row:last-child { border-bottom: 0; }
.pdm-row-icon {
  width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-size: 18px;
  background: rgba(var(--pdm-accent-rgb), 0.10); color: var(--pdm-accent);
}
.pdm-row-icon.is-project { background: rgba(125, 211, 252, 0.10); color: #7dd3fc; }
.pdm-row-main { flex: 1; min-width: 0; }
.pdm-row-title { font-size: 13.5px; font-weight: 600; color: var(--pdm-text); overflow-wrap: anywhere; }
.pdm-row-sub { font-size: 11.5px; color: var(--pdm-faint); margin-top: 2px; }
.pdm-row-right { flex-shrink: 0; font-size: 13px; font-weight: 700; color: #fff; text-align: right; max-width: 40%; overflow-wrap: anywhere; }
.pdm-empty { padding: 18px 0; text-align: center; font-size: 12px; color: var(--pdm-faint); }

.pdm-widget {
  margin-top: 14px; border-radius: 22px; padding: 16px 14px;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
  border: 1px solid var(--pdm-line);
}
.pdm-skel { border-radius: 22px; background: rgba(255, 255, 255, 0.05); animation: pdm-pulse 1.4s ease-in-out infinite; }
@keyframes pdm-pulse { 50% { opacity: 0.55; } }
.pdm-error {
  margin-top: 12px; font-size: 12px; color: #fecdd3; background: rgba(244, 63, 94, 0.14);
  border: 1px solid rgba(244, 63, 94, 0.3); border-radius: 12px; padding: 8px 12px;
}
@media (prefers-reduced-motion: reduce) { .pdm-spin, .pdm-skel { animation: none; } }

.pdm-palette {
  margin-top: 14px; padding: 14px 12px; border-radius: 20px;
  background: rgba(255, 255, 255, 0.05); border: 1px solid var(--pdm-line);
}
.pdm-palette-title { font-size: 12.5px; color: var(--pdm-muted); margin: 0 0 12px 2px; }
.pdm-swatches { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
.pdm-swatch {
  position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px;
  background: none; border: 0; padding: 0; color: var(--pdm-muted); font: inherit; font-size: 10.5px; cursor: pointer;
}
.pdm-swatch-dot { position: relative; width: 34px; height: 34px; border-radius: 50%; box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12); overflow: hidden; }
.pdm-swatch.is-on { color: #fff; font-weight: 600; }
.pdm-swatch.is-on .pdm-swatch-dot { box-shadow: 0 0 0 2px #070a08, 0 0 0 4px #fff; }
.pdm-swatch-custom .pdm-swatch-dot { background: conic-gradient(#f87171, #fbbf24, #a3e635, #22d3ee, #818cf8, #f472b6, #f87171); }
.pdm-swatch-custom input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; border: 0; padding: 0; }

/* Tant que ce tableau de bord est affiché : en-tête et barre d'onglets fondus
   dans le même noir, onglet actif en citron — un seul bloc, comme une app. */
body.peg-dash-dark .header { background: #070a08; border-color: rgba(255, 255, 255, 0.06); }
body.peg-dash-dark .peg-dock { background: rgba(10, 13, 11, 0.92); border-top-color: rgba(255, 255, 255, 0.06); }
body.peg-dash-dark .peg-dock-item.is-active .peg-dock-icon { background: rgba(var(--pdm-accent-rgb), 0.16); color: var(--pdm-accent); }
body.peg-dash-dark .peg-app-main { background: #070a08; }
`;

const DARK = '#070a08';

// ── Couleur du dégradé (et de l'accent) ─────────────────────────────────────
const ACCENT_KEY = 'peg:dashboardAccent';
const DEFAULT_ACCENT = '#c6f432';
const ACCENTS = [
  { name: 'Citron', hex: '#c6f432' },
  { name: 'Menthe', hex: '#34d399' },
  { name: 'Cyan', hex: '#22d3ee' },
  { name: 'Violet', hex: '#a78bfa' },
  { name: 'Rose', hex: '#f472b6' },
  { name: 'Orange', hex: '#fb923c' },
];
const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);
const loadAccent = (): string => {
  try {
    const v = localStorage.getItem(ACCENT_KEY);
    return v && isHex(v) ? v.toLowerCase() : DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
};
const rgbOf = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
// Texte posé SUR la couleur (pastilles, bouton actif) : sombre sur une teinte
// claire, blanc sur une teinte foncée — lisible quelle que soit la couleur choisie.
const onAccentOf = (hex: string) => {
  const [r, g, b] = rgbOf(hex).map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3 ? '#10140a' : '#ffffff';
};

// La couleur vit sur le body : la page, l'en-tête et la barre d'onglets la suivent
const useAccentVars = (accent: string) => {
  useEffect(() => {
    const st = document.body.style;
    st.setProperty('--pdm-accent', accent);
    st.setProperty('--pdm-accent-rgb', rgbOf(accent).join(', '));
    st.setProperty('--pdm-on-accent', onAccentOf(accent));
    return () => {
      st.removeProperty('--pdm-accent');
      st.removeProperty('--pdm-accent-rgb');
      st.removeProperty('--pdm-on-accent');
    };
  }, [accent]);
};

// Classe de page + barre d'état du téléphone au même noir, rétablies en sortant
const useDarkShell = () => {
  useEffect(() => {
    document.body.classList.add('peg-dash-dark');
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]'
    );
    const previous = meta?.content;
    if (meta) meta.content = DARK;
    return () => {
      document.body.classList.remove('peg-dash-dark');
      if (meta && previous) meta.content = previous;
    };
  }, []);
};

const DashboardAdminMobile = ({
  greeting,
  status,
  bannerUrl,
  onPickBanner,
  hidePrices,
  onTogglePrices,
  onRefresh,
  refreshing,
  error,
  dataReady,
  balance,
  tiles,
  stats,
  activity,
  widgets,
}: Props) => {
  useDarkShell();
  const [accent, setAccent] = useState(loadAccent);
  const [paletteOpen, setPaletteOpen] = useState(false);
  useAccentVars(accent);
  const chooseAccent = (hex: string) => {
    if (!isHex(hex)) return;
    const next = hex.toLowerCase();
    setAccent(next);
    try {
      localStorage.setItem(ACCENT_KEY, next);
    } catch {
      /* navigation privée : la couleur vaut pour la session */
    }
  };
  const isPreset = ACCENTS.some((a) => a.hex === accent);
  return (
    <div
      className="pdm"
      // Variables posées aussi ici : la page a sa couleur dès le premier rendu
      // (celles du body, pour l'en-tête et la barre d'onglets, suivent l'effet)
      style={
        {
          '--pdm-accent': accent,
          '--pdm-accent-rgb': rgbOf(accent).join(', '),
          '--pdm-on-accent': onAccentOf(accent),
        } as React.CSSProperties
      }
    >
      <style>{CSS}</style>

      <div className="pdm-top">
        <div className="pdm-hello">
          <h1>{greeting}</h1>
          <p>{status}</p>
        </div>
        <div className="pdm-icons">
          <button
            type="button"
            className={`pdm-icon-btn${hidePrices ? ' is-on' : ''}`}
            onClick={onTogglePrices}
            aria-pressed={hidePrices}
            aria-label={
              hidePrices ? 'Afficher les chiffres' : 'Masquer les chiffres'
            }
          >
            {hidePrices ? <HiOutlineEyeOff /> : <HiOutlineEye />}
          </button>
          <button
            type="button"
            className={`pdm-icon-btn${paletteOpen ? ' is-on' : ''}`}
            onClick={() => setPaletteOpen((o) => !o)}
            aria-expanded={paletteOpen}
            aria-label="Couleur du dégradé"
          >
            <HiOutlineColorSwatch />
          </button>
          <button
            type="button"
            className="pdm-icon-btn"
            onClick={onRefresh}
            aria-label="Actualiser"
          >
            <HiOutlineRefresh className={refreshing ? 'pdm-spin' : undefined} />
          </button>
          <button
            type="button"
            className="pdm-icon-btn"
            onClick={onPickBanner}
            aria-label="Changer la bannière"
          >
            <HiOutlinePhotograph />
          </button>
        </div>
      </div>

      {paletteOpen && (
        <div
          className="pdm-palette"
          role="group"
          aria-label="Couleur du dégradé"
        >
          <p className="pdm-palette-title">Couleur du dégradé</p>
          <div className="pdm-swatches">
            {ACCENTS.map((a) => (
              <button
                key={a.hex}
                type="button"
                className={`pdm-swatch${accent === a.hex ? ' is-on' : ''}`}
                aria-pressed={accent === a.hex}
                onClick={() => chooseAccent(a.hex)}
              >
                <span
                  className="pdm-swatch-dot"
                  style={{ background: a.hex }}
                />
                {a.name}
              </button>
            ))}
            <label
              className={`pdm-swatch pdm-swatch-custom${isPreset ? '' : ' is-on'}`}
            >
              <span className="pdm-swatch-dot">
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => chooseAccent(e.target.value)}
                  aria-label="Autre couleur"
                />
              </span>
              Autre
            </label>
          </div>
        </div>
      )}

      {error && <div className="pdm-error">{error}</div>}

      {/* Solde : le CA, en grand, sur la bannière admin estompée */}
      <section className="pdm-balance">
        {bannerUrl && (
          <img
            className="pdm-balance-bg"
            src={bannerUrl}
            alt=""
            aria-hidden="true"
          />
        )}
        <div className="pdm-balance-label">
          {balance.label}
          <button
            type="button"
            className="pdm-eye"
            onClick={onTogglePrices}
            aria-label={
              hidePrices ? 'Afficher les chiffres' : 'Masquer les chiffres'
            }
          >
            {hidePrices ? <HiOutlineEyeOff /> : <HiOutlineEye />}
          </button>
        </div>
        {dataReady ? (
          <>
            <div className="pdm-balance-value">{balance.value}</div>
            <div className="pdm-balance-sub">
              <span>{balance.sub}</span>
              {balance.delta}
              {balance.deltaNote && <span>{balance.deltaNote}</span>}
            </div>
          </>
        ) : (
          <div
            className="pdm-skel"
            style={{ height: 52, width: 200, margin: '10px auto 0' }}
          />
        )}
      </section>

      {/* Tuiles */}
      <div className="pdm-tiles">
        {dataReady
          ? tiles.map((t) => {
              const inner = (
                <>
                  <span className="pdm-tile-icon">{t.icon}</span>
                  <span className="pdm-tile-label">{t.label}</span>
                  <span className="pdm-tile-value">{t.value}</span>
                  {t.sub && <span className="pdm-tile-sub">{t.sub}</span>}
                  {t.onClick && (
                    <HiOutlineChevronRight className="pdm-tile-go" />
                  )}
                </>
              );
              return t.onClick ? (
                <button
                  key={t.key}
                  type="button"
                  className="pdm-tile"
                  data-tone={t.tone}
                  onClick={t.onClick}
                >
                  {inner}
                </button>
              ) : (
                <div key={t.key} className="pdm-tile" data-tone={t.tone}>
                  {inner}
                </div>
              );
            })
          : Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="pdm-skel" style={{ height: 124 }} />
            ))}
      </div>

      {/* Raccourcis ronds */}
      {dataReady && (
        <>
          <div className="pdm-section-head">
            <h2>Opérations</h2>
          </div>
          <div className="pdm-stats">
            {stats.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`pdm-stat${s.alert ? ' is-alert' : ''}`}
                onClick={s.onClick}
                disabled={!s.onClick}
              >
                <span className="pdm-stat-ring">
                  {s.value}
                  <span className="pdm-stat-icon">{s.icon}</span>
                </span>
                <span className="pdm-stat-label">{s.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Liste façon transactions */}
      {activity && (
        <>
          <div className="pdm-section-head">
            <h2>{activity.title}</h2>
            <span>{activity.subtitle}</span>
          </div>
          <div className="pdm-list">
            {!dataReady ? (
              <div
                className="pdm-skel"
                style={{ height: 180, margin: '10px 0' }}
              />
            ) : activity.items.length === 0 ? (
              <div className="pdm-empty">Aucune activité</div>
            ) : (
              activity.items.map((it, i) => (
                <div key={i} className="pdm-row">
                  <span
                    className={`pdm-row-icon${it.type === 'project' ? ' is-project' : ''}`}
                  >
                    {it.type === 'invoice' ? (
                      <HiOutlineDocumentDuplicate />
                    ) : (
                      <HiOutlineCube />
                    )}
                  </span>
                  <div className="pdm-row-main">
                    <div className="pdm-row-title">{it.left}</div>
                    {it.sub && <div className="pdm-row-sub">{it.sub}</div>}
                  </div>
                  <div className="pdm-row-right">{it.right}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Widgets de l'admin (ordre et masquage : ses réglages) */}
      {widgets.map((w) => (
        <div key={w.id} className="pdm-widget">
          {w.content}
        </div>
      ))}
    </div>
  );
};

export default DashboardAdminMobile;
