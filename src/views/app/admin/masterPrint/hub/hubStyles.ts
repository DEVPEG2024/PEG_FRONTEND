/*
 * Page Master Print à onglets — feuille de style (injectée par <style>, comme
 * OFFERS_PAGE_CSS). Préfixe `mpx-`.
 *
 * Identité : l'imprimerie. Bleu nuit PEG, violet PEG pour l'action, et les encres
 * d'impression (jaune, magenta, cyan) pour les étapes de fabrication ; barre de
 * contrôle couleur et repère de calage comme on en voit sur les feuilles d'essai.
 *
 * Mise en page sur la LARGEUR RÉELLE de la page (requêtes de conteneur) : la barre
 * latérale de 290 px rend trompeuses les requêtes d'écran (cf. grilles de cartes
 * rognées sur iPad / bureau moyen).
 */
export const HUB_CSS = `
.mpx { container-type: inline-size; font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; color: #f2f5fc; padding-bottom: 32px; }
.mpx *, .mpx *::before, .mpx *::after { box-sizing: border-box; }
.mpx :focus-visible { outline: 2px solid #9d92ff; outline-offset: 2px; }

/* ── En-tête ───────────────────────────────────────────────────────────── */
.mpx-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px 18px; margin: 6px 0 14px; }
.mpx-brand { display: flex; align-items: center; gap: 16px; min-width: 0; }
.mpx-colorbar { display: grid; grid-template-columns: repeat(2, 11px); grid-auto-rows: 11px; gap: 3px; flex-shrink: 0; }
.mpx-colorbar span { border-radius: 3px; }
.mpx-title-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.mpx-title { font-size: 30px; font-weight: 800; letter-spacing: -0.035em; line-height: 1.05; margin: 0; color: #fff; }
.mpx-sub { color: rgba(226,232,255,0.6); font-size: 13.5px; margin: 6px 0 0; line-height: 1.45; }
.mpx-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; border: 1px solid transparent; }
.mpx-pill i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; display: inline-block; }
.mpx-pill--sandbox { color: #fcd34d; background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.3); }
.mpx-pill--live { color: #86efac; background: rgba(34,197,94,0.12); border-color: rgba(34,197,94,0.3); }
.mpx-pill--ok { color: #86efac; background: rgba(34,197,94,0.08); border-color: rgba(34,197,94,0.22); }
.mpx-pill--warn { color: #fcd34d; background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.3); }
.mpx-pill--down { color: #fca5a5; background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.35); }

.mpx-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 38px; padding: 8px 16px; border-radius: 12px; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; text-decoration: none; transition: background 120ms ease, border-color 120ms ease; }
.mpx-btn--primary { color: #fff; border: 0; background: linear-gradient(135deg, #8b7dff 0%, #5b47e0 100%); box-shadow: 0 6px 18px rgba(91,71,224,0.35); }
.mpx-btn--primary:hover { background: linear-gradient(135deg, #9b8fff 0%, #6a57ea 100%); }
.mpx-btn--ghost { color: rgba(240,244,255,0.9); border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); }
.mpx-btn--ghost:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); }
.mpx-btn[disabled] { opacity: 0.55; cursor: not-allowed; }

/* ── Onglets ───────────────────────────────────────────────────────────── */
.mpx-tabs { display: flex; gap: 2px; overflow-x: auto; scrollbar-width: none; border-bottom: 1px solid rgba(140,160,255,0.12); margin: 0 0 22px; }
.mpx-tabs::-webkit-scrollbar { display: none; }
.mpx-tab { position: relative; display: inline-flex; align-items: center; gap: 8px; padding: 12px 14px 13px; font: inherit; font-size: 14px; font-weight: 600; color: rgba(226,232,255,0.58); background: none; border: 0; border-radius: 10px 10px 0 0; cursor: pointer; white-space: nowrap; }
.mpx-tab svg { font-size: 17px; opacity: 0.85; }
.mpx-tab:hover { color: #fff; background: rgba(255,255,255,0.03); }
.mpx-tab[aria-selected="true"] { color: #fff; }
.mpx-tab[aria-selected="true"]::after { content: ''; position: absolute; left: 12px; right: 12px; bottom: -1px; height: 3px; border-radius: 3px 3px 0 0; background: #8b7dff; }
.mpx-tab:focus-visible { outline-offset: -3px; }
.mpx-badge { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px; font-size: 11.5px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; font-variant-numeric: tabular-nums; }
.mpx-badge--danger { background: rgba(248,113,113,0.18); color: #fca5a5; }
.mpx-badge--warning { background: rgba(251,191,36,0.16); color: #fcd34d; }
.mpx-badge--info { background: rgba(139,125,255,0.18); color: #c4bcff; }
.mpx-badge--dot { min-width: 8px; width: 8px; height: 8px; padding: 0; }
.mpx-badge--dot.mpx-badge--danger { background: #f87171; }
.mpx-badge--dot.mpx-badge--warning { background: #fbbf24; }

/* ── Grille ────────────────────────────────────────────────────────────── */
.mpx-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 16px; }
.mpx-s12 { grid-column: span 12; } .mpx-s7 { grid-column: span 7; } .mpx-s5 { grid-column: span 5; } .mpx-s3 { grid-column: span 3; }
@container (max-width: 860px) { .mpx-s7, .mpx-s5 { grid-column: span 12; } }
@container (max-width: 760px) { .mpx-s3 { grid-column: span 6; } }
@container (max-width: 560px) { .mpx-grid { gap: 12px; } .mpx-title { font-size: 24px; } }

/* ── Cartes ────────────────────────────────────────────────────────────── */
.mpx-card { position: relative; min-width: 0; background: linear-gradient(165deg, #16223b 0%, #0f182b 100%); border: 1px solid rgba(140,160,255,0.09); border-radius: 20px; padding: 20px 22px; }
.mpx-card-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 6px 12px; margin-bottom: 16px; }
.mpx-card-title { font-size: 16px; font-weight: 700; letter-spacing: -0.01em; margin: 0; color: #fff; }
.mpx-card-note { font-size: 12.5px; color: rgba(226,232,255,0.5); margin: 2px 0 0; }
.mpx-link { color: #b9b0ff; font-size: 13px; font-weight: 600; text-decoration: none; background: none; border: 0; padding: 0; cursor: pointer; font-family: inherit; }
.mpx-link:hover { color: #d4ceff; text-decoration: underline; }
.mpx-muted { color: rgba(226,232,255,0.55); font-size: 13px; line-height: 1.5; margin: 0; }
@container (max-width: 560px) { .mpx-card { padding: 16px; border-radius: 18px; } }

/* ── Atelier : la chaîne de fabrication ────────────────────────────────── */
.mpx-hero { border-radius: 24px; padding: 26px 28px 24px; overflow: hidden;
  background: radial-gradient(80% 130% at 100% 0%, rgba(124,108,240,0.22) 0%, rgba(124,108,240,0) 60%), linear-gradient(165deg, #18253f 0%, #0e1628 100%); }
.mpx-regmark { position: absolute; top: 18px; right: 20px; width: 38px; height: 38px; color: rgba(226,232,255,0.22); pointer-events: none; }
.mpx-hero-title { font-size: 22px; font-weight: 800; letter-spacing: -0.025em; margin: 0; color: #fff; }
.mpx-hero-lead { font-size: 14.5px; color: rgba(226,232,255,0.72); margin: 6px 0 0; max-width: 62ch; line-height: 1.5; }
.mpx-hero-lead strong { color: #fff; }
.mpx-line { --n: 4; position: relative; display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); margin-top: 28px; }
.mpx-track { position: absolute; top: 32px; left: calc(100% / var(--n) / 2); right: calc(100% / var(--n) / 2); height: 3px; border-radius: 3px; opacity: 0.6; }
.mpx-station { position: relative; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 0 6px; text-align: center; min-width: 0; }
.mpx-node { position: relative; width: 66px; height: 66px; flex-shrink: 0; border-radius: 50%; display: grid; place-items: center; background: #101a2e; border: 3px solid var(--ink); box-shadow: 0 0 0 6px #142039; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; color: #fff; }
.mpx-node--empty { border-color: rgba(255,255,255,0.14); color: rgba(226,232,255,0.4); }
.mpx-node--wait::before { content: ''; position: absolute; inset: -10px; border-radius: 50%; border: 2px solid var(--ink); opacity: 0; animation: mpx-pulse 2.6s ease-out infinite; }
@keyframes mpx-pulse { 0% { transform: scale(0.86); opacity: 0.75; } 100% { transform: scale(1.22); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .mpx-node--wait::before { animation: none; opacity: 0.45; transform: none; } }
.mpx-station-text { display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 0; }
.mpx-station-label { font-size: 14px; font-weight: 700; color: #fff; }
.mpx-station-note { font-size: 12px; font-weight: 600; }
.mpx-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 5px; }
.mpx-chip { font: inherit; font-size: 11.5px; font-weight: 600; font-variant-numeric: tabular-nums; padding: 3px 8px; border-radius: 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09); color: rgba(240,244,255,0.85); cursor: pointer; }
.mpx-chip:hover { background: rgba(255,255,255,0.11); }
.mpx-chip--danger { border-color: rgba(248,113,113,0.55); color: #fecaca; }
.mpx-chip--more { cursor: default; background: none; border-style: dashed; }
.mpx-hero-foot { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 22px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 12.5px; color: rgba(226,232,255,0.5); }
@container (max-width: 640px) {
  .mpx-hero { padding: 20px 18px; border-radius: 20px; }
  .mpx-regmark { width: 30px; height: 30px; top: 14px; right: 14px; }
  .mpx-line { grid-template-columns: minmax(0, 1fr); gap: 18px; margin-top: 22px; }
  .mpx-track { --dir: 180deg; top: 30px; bottom: 30px; left: 27px; right: auto; width: 3px; height: auto; }
  .mpx-station { flex-direction: row; align-items: center; text-align: left; gap: 16px; padding: 0; }
  .mpx-station-text { align-items: flex-start; }
  .mpx-chips { justify-content: flex-start; }
  .mpx-node { width: 56px; height: 56px; font-size: 20px; box-shadow: 0 0 0 5px #142039; }
}

/* ── Chiffres clés ─────────────────────────────────────────────────────── */
.mpx-kpi { display: flex; flex-direction: column; gap: 12px; padding: 18px; border-radius: 18px; }
.mpx-kpi--link { cursor: pointer; text-align: left; font: inherit; color: inherit; width: 100%; }
.mpx-kpi--link:hover { border-color: rgba(157,146,255,0.35); }
.mpx-kpi-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.mpx-kpi-label { font-size: 13px; font-weight: 600; color: rgba(226,232,255,0.65); }
.mpx-kpi-icon { width: 34px; height: 34px; border-radius: 11px; display: grid; place-items: center; font-size: 18px; flex-shrink: 0; }
.mpx-kpi-value { font-size: 32px; font-weight: 800; letter-spacing: -0.035em; line-height: 1; color: #fff; overflow-wrap: anywhere; }
.mpx-kpi-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 30px; font-size: 12.5px; color: rgba(226,232,255,0.55); }
.mpx-delta { display: inline-flex; align-items: center; gap: 3px; font-weight: 700; color: rgba(240,244,255,0.85); }
.mpx-delta--good { color: #6ee7a8; } .mpx-delta--bad { color: #fca5a5; }
@container (max-width: 560px) { .mpx-kpi { padding: 14px; gap: 10px; } .mpx-kpi-value { font-size: 24px; } .mpx-kpi-icon { width: 30px; height: 30px; font-size: 16px; } .mpx-kpi-foot svg.mpx-spark { display: none; } }

/* ── À faire ───────────────────────────────────────────────────────────── */
.mpx-actions { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.mpx-action { display: grid; grid-template-columns: 38px minmax(0, 1fr) auto; align-items: center; gap: 12px 14px; padding: 12px 14px; border-radius: 14px; background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.06); }
.mpx-action-icon { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; font-size: 19px; }
.mpx-action-title { font-size: 14px; font-weight: 700; margin: 0; color: #fff; }
.mpx-action-detail { font-size: 12.5px; color: rgba(226,232,255,0.58); margin: 3px 0 0; line-height: 1.45; overflow-wrap: anywhere; }
@container (max-width: 560px) { .mpx-action { grid-template-columns: 34px minmax(0, 1fr); } .mpx-action-icon { width: 34px; height: 34px; font-size: 17px; } .mpx-action-cta { grid-column: 2; justify-self: start; } }
.mpx-allgood { display: flex; align-items: center; gap: 14px; padding: 18px; border-radius: 14px; background: rgba(34,197,94,0.07); border: 1px solid rgba(34,197,94,0.2); }

/* ── Anneaux ───────────────────────────────────────────────────────────── */
.mpx-rings { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 14px; }
.mpx-ring { display: flex; align-items: center; gap: 12px; min-width: 0; }
.mpx-ring-text { min-width: 0; }
.mpx-ring-name { font-size: 13px; font-weight: 600; color: #fff; margin: 0; }
.mpx-ring-sub { font-size: 12px; color: rgba(226,232,255,0.5); margin: 2px 0 0; }
.mpx-todo-list { list-style: none; margin: 16px 0 0; padding: 14px 0 0; border-top: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; gap: 8px; }
.mpx-todo-list li { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 13px; }
.mpx-todo-list li span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: rgba(240,244,255,0.85); }

/* ── Graphique ─────────────────────────────────────────────────────────── */
.mpx-legend { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-bottom: 12px; }
.mpx-legend span { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; color: rgba(226,232,255,0.75); }
.mpx-legend i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.mpx-chart { position: relative; padding-left: 52px; }
.mpx-col { flex: 1; height: 100%; display: flex; align-items: flex-end; justify-content: center; gap: 3px; border-radius: 8px; cursor: default; }
.mpx-col[data-on="true"] { background: rgba(255,255,255,0.04); }
.mpx-col:focus-visible { outline-offset: -2px; }
.mpx-bar { width: min(22px, 34%); border-radius: 5px 5px 0 0; }
.mpx-tip { position: absolute; transform: translateX(-50%); background: #0a1222; border: 1px solid rgba(255,255,255,0.14); border-radius: 12px; padding: 9px 11px; font-size: 12px; white-space: nowrap; box-shadow: 0 10px 28px rgba(0,0,0,0.45); z-index: 2; pointer-events: none; }
.mpx-tip i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 6px; }
.mpx-chart-foot { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.06); }
.mpx-chart-foot p { margin: 0; font-size: 12px; color: rgba(226,232,255,0.5); }
.mpx-chart-foot strong { display: block; font-size: 16px; font-weight: 800; letter-spacing: -0.02em; color: #fff; margin-top: 2px; font-variant-numeric: tabular-nums; }

/* ── Commandes ─────────────────────────────────────────────────────────── */
.mpx-orders { list-style: none; margin: 0; padding: 0; }
.mpx-order { display: grid; grid-template-columns: 10px minmax(0, 1.1fr) minmax(0, 1.4fr) auto; align-items: center; gap: 14px; padding: 12px 8px; border-radius: 12px; cursor: pointer; }
.mpx-order + .mpx-order { border-top: 1px solid rgba(255,255,255,0.05); }
.mpx-order:hover { background: rgba(255,255,255,0.03); }
.mpx-order-dot { width: 10px; height: 10px; border-radius: 50%; }
.mpx-order-id { font-size: 13.5px; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; }
.mpx-order-status { font-size: 12px; color: rgba(226,232,255,0.6); margin-top: 2px; }
.mpx-order-project { font-size: 13px; color: rgba(240,244,255,0.85); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mpx-order-amount { font-size: 13.5px; font-weight: 700; text-align: right; font-variant-numeric: tabular-nums; }
.mpx-order-alert { display: inline-block; margin-left: 6px; font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 6px; vertical-align: 1px; }
@container (max-width: 640px) { .mpx-order { grid-template-columns: 10px minmax(0, 1fr) auto; } .mpx-order-project { grid-column: 2 / 4; white-space: normal; } }

/* ── Compte ────────────────────────────────────────────────────────────── */
.mpx-tier { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 8px; font-size: 12px; font-weight: 800; color: #2a1d05; background: linear-gradient(135deg, #f8dc85 0%, #d4a43a 100%); }
.mpx-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.mpx-fact { padding: 12px 14px; border-radius: 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); min-width: 0; }
.mpx-fact p { margin: 0; font-size: 12px; color: rgba(226,232,255,0.5); }
.mpx-fact strong { display: block; margin-top: 3px; font-size: 14.5px; font-weight: 700; color: #fff; overflow-wrap: anywhere; }
.mpx-sync { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 14px; padding: 14px; border-radius: 14px; margin-bottom: 16px; }
.mpx-sync--on { background: rgba(34,197,94,0.07); border: 1px solid rgba(34,197,94,0.2); }
.mpx-sync--off { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.28); }
.mpx-families { display: flex; flex-wrap: wrap; gap: 6px; }
.mpx-family { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09); color: rgba(240,244,255,0.82); }
.mpx-family--live { background: rgba(34,197,94,0.1); border-color: rgba(34,197,94,0.3); color: #b6f2cf; }
`;
