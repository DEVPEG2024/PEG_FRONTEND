/*
 * Design « hub » commun (22/11/2026) — feuille de style injectée par <style>
 * (comme OFFERS_PAGE_CSS), préfixe `hx-`. Utilisée par la page Master Print à
 * onglets (views/app/admin/masterPrint/hub) et par l'accueil admin PEG
 * (views/app/admin/home/DashboardAdminHub.tsx). Widgets communs : HubWidgets.tsx.
 *
 * Bleu nuit PEG, violet PEG pour l'action ; côté Master Print, les encres
 * d'impression (jaune, magenta, cyan) pour les étapes de fabrication, barre de
 * contrôle couleur et repère de calage.
 *
 * Mise en page sur la LARGEUR RÉELLE de la page (requêtes de conteneur) : la barre
 * latérale de 290 px rend trompeuses les requêtes d'écran (cf. grilles de cartes
 * rognées sur iPad / bureau moyen).
 */
export const HUB_CSS = `
.hx { container-type: inline-size; font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; color: #f2f5fc; padding-bottom: 32px; }
.hx *, .hx *::before, .hx *::after { box-sizing: border-box; }
.hx :focus-visible { outline: 2px solid #9d92ff; outline-offset: 2px; }

/* ── En-tête ───────────────────────────────────────────────────────────── */
.hx-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px 18px; margin: 6px 0 14px; }
.hx-brand { display: flex; align-items: center; gap: 16px; min-width: 0; }
.hx-colorbar { display: grid; grid-template-columns: repeat(2, 11px); grid-auto-rows: 11px; gap: 3px; flex-shrink: 0; }
.hx-colorbar span { border-radius: 3px; }
.hx-title-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.hx-title { font-size: 30px; font-weight: 800; letter-spacing: -0.035em; line-height: 1.05; margin: 0; color: #fff; }
.hx-sub { color: rgba(226,232,255,0.6); font-size: 13.5px; margin: 6px 0 0; line-height: 1.45; }
.hx-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; border: 1px solid transparent; }
.hx-pill i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; display: inline-block; }
.hx-pill--sandbox { color: #fcd34d; background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.3); }
.hx-pill--live { color: #86efac; background: rgba(34,197,94,0.12); border-color: rgba(34,197,94,0.3); }
.hx-pill--ok { color: #86efac; background: rgba(34,197,94,0.08); border-color: rgba(34,197,94,0.22); }
.hx-pill--warn { color: #fcd34d; background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.3); }
.hx-pill--down { color: #fca5a5; background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.35); }

.hx-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 38px; padding: 8px 16px; border-radius: 12px; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; text-decoration: none; transition: background 120ms ease, border-color 120ms ease; }
.hx-btn--primary { color: #fff; border: 0; background: linear-gradient(135deg, #8b7dff 0%, #5b47e0 100%); box-shadow: 0 6px 18px rgba(91,71,224,0.35); }
.hx-btn--primary:hover { background: linear-gradient(135deg, #9b8fff 0%, #6a57ea 100%); }
.hx-btn--ghost { color: rgba(240,244,255,0.9); border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); }
.hx-btn--ghost:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); }
.hx-btn[disabled] { opacity: 0.55; cursor: not-allowed; }

/* ── Onglets ───────────────────────────────────────────────────────────── */
.hx-tabs { display: flex; gap: 2px; overflow-x: auto; scrollbar-width: none; border-bottom: 1px solid rgba(140,160,255,0.12); margin: 0 0 22px; }
.hx-tabs::-webkit-scrollbar { display: none; }
.hx-tab { position: relative; display: inline-flex; align-items: center; gap: 8px; padding: 12px 14px 13px; font: inherit; font-size: 14px; font-weight: 600; color: rgba(226,232,255,0.58); background: none; border: 0; border-radius: 10px 10px 0 0; cursor: pointer; white-space: nowrap; }
.hx-tab svg { font-size: 17px; opacity: 0.85; }
.hx-tab:hover { color: #fff; background: rgba(255,255,255,0.03); }
.hx-tab[aria-selected="true"] { color: #fff; }
.hx-tab[aria-selected="true"]::after { content: ''; position: absolute; left: 12px; right: 12px; bottom: -1px; height: 3px; border-radius: 3px 3px 0 0; background: #8b7dff; }
.hx-tab:focus-visible { outline-offset: -3px; }
.hx-badge { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px; font-size: 11.5px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; font-variant-numeric: tabular-nums; }
.hx-badge--danger { background: rgba(248,113,113,0.18); color: #fca5a5; }
.hx-badge--warning { background: rgba(251,191,36,0.16); color: #fcd34d; }
.hx-badge--info { background: rgba(139,125,255,0.18); color: #c4bcff; }
.hx-badge--dot { min-width: 8px; width: 8px; height: 8px; padding: 0; }
.hx-badge--dot.hx-badge--danger { background: #f87171; }
.hx-badge--dot.hx-badge--warning { background: #fbbf24; }

/* ── Grille ────────────────────────────────────────────────────────────── */
.hx-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 16px; }
.hx-s12 { grid-column: span 12; } .hx-s7 { grid-column: span 7; } .hx-s5 { grid-column: span 5; } .hx-s3 { grid-column: span 3; }
@container (max-width: 860px) { .hx-s7, .hx-s5 { grid-column: span 12; } }
@container (max-width: 760px) { .hx-s3 { grid-column: span 6; } }
@container (max-width: 560px) { .hx-grid { gap: 12px; } .hx-title { font-size: 24px; } }

/* ── Cartes ────────────────────────────────────────────────────────────── */
.hx-card { position: relative; min-width: 0; background: linear-gradient(165deg, #16223b 0%, #0f182b 100%); border: 1px solid rgba(140,160,255,0.09); border-radius: 20px; padding: 20px 22px; }
.hx-card-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 6px 12px; margin-bottom: 16px; }
.hx-card-title { font-size: 16px; font-weight: 700; letter-spacing: -0.01em; margin: 0; color: #fff; }
.hx-card-note { font-size: 12.5px; color: rgba(226,232,255,0.5); margin: 2px 0 0; }
.hx-link { color: #b9b0ff; font-size: 13px; font-weight: 600; text-decoration: none; background: none; border: 0; padding: 0; cursor: pointer; font-family: inherit; }
.hx-link:hover { color: #d4ceff; text-decoration: underline; }
.hx-muted { color: rgba(226,232,255,0.55); font-size: 13px; line-height: 1.5; margin: 0; }
@container (max-width: 560px) { .hx-card { padding: 16px; border-radius: 18px; } }

/* ── Atelier : la chaîne de fabrication ────────────────────────────────── */
.hx-hero { border-radius: 24px; padding: 26px 28px 24px; overflow: hidden;
  background: radial-gradient(80% 130% at 100% 0%, rgba(124,108,240,0.22) 0%, rgba(124,108,240,0) 60%), linear-gradient(165deg, #18253f 0%, #0e1628 100%); }
.hx-regmark { position: absolute; top: 18px; right: 20px; width: 38px; height: 38px; color: rgba(226,232,255,0.22); pointer-events: none; }
.hx-hero-title { font-size: 22px; font-weight: 800; letter-spacing: -0.025em; margin: 0; color: #fff; }
.hx-hero-lead { font-size: 14.5px; color: rgba(226,232,255,0.72); margin: 6px 0 0; max-width: 62ch; line-height: 1.5; }
.hx-hero-lead strong { color: #fff; }
.hx-line { --n: 4; position: relative; display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); margin-top: 28px; }
.hx-track { position: absolute; top: 32px; left: calc(100% / var(--n) / 2); right: calc(100% / var(--n) / 2); height: 3px; border-radius: 3px; opacity: 0.6; }
.hx-station { position: relative; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 0 6px; text-align: center; min-width: 0; }
.hx-node { position: relative; width: 66px; height: 66px; flex-shrink: 0; border-radius: 50%; display: grid; place-items: center; background: #101a2e; border: 3px solid var(--ink); box-shadow: 0 0 0 6px #142039; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; color: #fff; }
.hx-node--empty { border-color: rgba(255,255,255,0.14); color: rgba(226,232,255,0.4); }
.hx-node--wait::before { content: ''; position: absolute; inset: -10px; border-radius: 50%; border: 2px solid var(--ink); opacity: 0; animation: hx-pulse 2.6s ease-out infinite; }
@keyframes hx-pulse { 0% { transform: scale(0.86); opacity: 0.75; } 100% { transform: scale(1.22); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .hx-node--wait::before { animation: none; opacity: 0.45; transform: none; } }
.hx-station-text { display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 0; }
.hx-station-label { font-size: 14px; font-weight: 700; color: #fff; }
.hx-station-note { font-size: 12px; font-weight: 600; }
.hx-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 5px; }
.hx-chip { font: inherit; font-size: 11.5px; font-weight: 600; font-variant-numeric: tabular-nums; padding: 3px 8px; border-radius: 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09); color: rgba(240,244,255,0.85); cursor: pointer; }
.hx-chip:hover { background: rgba(255,255,255,0.11); }
.hx-chip--danger { border-color: rgba(248,113,113,0.55); color: #fecaca; }
.hx-chip--more { cursor: default; background: none; border-style: dashed; }
.hx-hero-foot { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 22px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 12.5px; color: rgba(226,232,255,0.5); }
@container (max-width: 640px) {
  .hx-hero { padding: 20px 18px; border-radius: 20px; }
  .hx-regmark { width: 30px; height: 30px; top: 14px; right: 14px; }
  .hx-line { grid-template-columns: minmax(0, 1fr); gap: 18px; margin-top: 22px; }
  .hx-track { --dir: 180deg; top: 30px; bottom: 30px; left: 27px; right: auto; width: 3px; height: auto; }
  .hx-station { flex-direction: row; align-items: center; text-align: left; gap: 16px; padding: 0; }
  .hx-station-text { align-items: flex-start; }
  .hx-chips { justify-content: flex-start; }
  .hx-node { width: 56px; height: 56px; font-size: 20px; box-shadow: 0 0 0 5px #142039; }
}

/* ── Chiffres clés ─────────────────────────────────────────────────────── */
.hx-kpi { display: flex; flex-direction: column; gap: 12px; padding: 18px; border-radius: 18px; }
.hx-kpi--link { cursor: pointer; text-align: left; font: inherit; color: inherit; width: 100%; }
.hx-kpi--link:hover { border-color: rgba(157,146,255,0.35); }
.hx-kpi-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.hx-kpi-label { font-size: 13px; font-weight: 600; color: rgba(226,232,255,0.65); }
.hx-kpi-icon { width: 34px; height: 34px; border-radius: 11px; display: grid; place-items: center; font-size: 18px; flex-shrink: 0; }
.hx-kpi-value { font-size: 32px; font-weight: 800; letter-spacing: -0.035em; line-height: 1; color: #fff; overflow-wrap: anywhere; }
.hx-kpi-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 30px; font-size: 12.5px; color: rgba(226,232,255,0.55); }
.hx-delta { display: inline-flex; align-items: center; gap: 3px; font-weight: 700; color: rgba(240,244,255,0.85); }
.hx-delta--good { color: #6ee7a8; } .hx-delta--bad { color: #fca5a5; }
@container (max-width: 560px) { .hx-kpi { padding: 14px; gap: 10px; } .hx-kpi-value { font-size: 24px; } .hx-kpi-icon { width: 30px; height: 30px; font-size: 16px; } .hx-kpi-foot svg.hx-spark { display: none; } }

/* ── À faire ───────────────────────────────────────────────────────────── */
.hx-actions { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.hx-action { display: grid; grid-template-columns: 38px minmax(0, 1fr) auto; align-items: center; gap: 12px 14px; padding: 12px 14px; border-radius: 14px; background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.06); }
.hx-action-icon { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; font-size: 19px; }
.hx-action-title { font-size: 14px; font-weight: 700; margin: 0; color: #fff; }
.hx-action-detail { font-size: 12.5px; color: rgba(226,232,255,0.58); margin: 3px 0 0; line-height: 1.45; overflow-wrap: anywhere; }
@container (max-width: 560px) { .hx-action { grid-template-columns: 34px minmax(0, 1fr); } .hx-action-icon { width: 34px; height: 34px; font-size: 17px; } .hx-action-cta { grid-column: 2; justify-self: start; } }
.hx-allgood { display: flex; align-items: center; gap: 14px; padding: 18px; border-radius: 14px; background: rgba(34,197,94,0.07); border: 1px solid rgba(34,197,94,0.2); }

/* ── Anneaux ───────────────────────────────────────────────────────────── */
.hx-rings { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 14px; }
.hx-ring { display: flex; align-items: center; gap: 12px; min-width: 0; }
.hx-ring-text { min-width: 0; }
.hx-ring-name { font-size: 13px; font-weight: 600; color: #fff; margin: 0; }
.hx-ring-sub { font-size: 12px; color: rgba(226,232,255,0.5); margin: 2px 0 0; }
.hx-todo-list { list-style: none; margin: 16px 0 0; padding: 14px 0 0; border-top: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; gap: 8px; }
.hx-todo-list li { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 13px; }
.hx-todo-list li span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: rgba(240,244,255,0.85); }

/* ── Graphique ─────────────────────────────────────────────────────────── */
.hx-legend { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-bottom: 12px; }
.hx-legend span { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; color: rgba(226,232,255,0.75); }
.hx-legend i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.hx-chart { position: relative; padding-left: 52px; }
.hx-col { flex: 1; height: 100%; display: flex; align-items: flex-end; justify-content: center; gap: 3px; border-radius: 8px; cursor: default; }
.hx-col[data-on="true"] { background: rgba(255,255,255,0.04); }
.hx-col:focus-visible { outline-offset: -2px; }
.hx-bar { width: min(22px, 34%); border-radius: 5px 5px 0 0; }
.hx-tip { position: absolute; transform: translateX(-50%); background: #0a1222; border: 1px solid rgba(255,255,255,0.14); border-radius: 12px; padding: 9px 11px; font-size: 12px; white-space: nowrap; box-shadow: 0 10px 28px rgba(0,0,0,0.45); z-index: 2; pointer-events: none; }
.hx-tip i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 6px; }
.hx-chart-foot { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.06); }
.hx-chart-foot p { margin: 0; font-size: 12px; color: rgba(226,232,255,0.5); }
.hx-chart-foot strong { display: block; font-size: 16px; font-weight: 800; letter-spacing: -0.02em; color: #fff; margin-top: 2px; font-variant-numeric: tabular-nums; }

/* ── Commandes ─────────────────────────────────────────────────────────── */
.hx-orders { list-style: none; margin: 0; padding: 0; }
.hx-order { display: grid; grid-template-columns: 10px minmax(0, 1.1fr) minmax(0, 1.4fr) auto; align-items: center; gap: 14px; padding: 12px 8px; border-radius: 12px; cursor: pointer; }
.hx-order + .hx-order { border-top: 1px solid rgba(255,255,255,0.05); }
.hx-order:hover { background: rgba(255,255,255,0.03); }
.hx-order-dot { width: 10px; height: 10px; border-radius: 50%; }
.hx-order-id { font-size: 13.5px; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; }
.hx-order-status { font-size: 12px; color: rgba(226,232,255,0.6); margin-top: 2px; }
.hx-order-project { font-size: 13px; color: rgba(240,244,255,0.85); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hx-order-amount { font-size: 13.5px; font-weight: 700; text-align: right; font-variant-numeric: tabular-nums; }
.hx-order-alert { display: inline-block; margin-left: 6px; font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 6px; vertical-align: 1px; }
@container (max-width: 640px) { .hx-order { grid-template-columns: 10px minmax(0, 1fr) auto; } .hx-order-project { grid-column: 2 / 4; white-space: normal; } }

/* ── Compte ────────────────────────────────────────────────────────────── */
.hx-tier { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 8px; font-size: 12px; font-weight: 800; color: #2a1d05; background: linear-gradient(135deg, #f8dc85 0%, #d4a43a 100%); }
.hx-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.hx-fact { padding: 12px 14px; border-radius: 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); min-width: 0; }
.hx-fact p { margin: 0; font-size: 12px; color: rgba(226,232,255,0.5); }
.hx-fact strong { display: block; margin-top: 3px; font-size: 14.5px; font-weight: 700; color: #fff; overflow-wrap: anywhere; }
.hx-sync { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 14px; padding: 14px; border-radius: 14px; margin-bottom: 16px; }
.hx-sync--on { background: rgba(34,197,94,0.07); border: 1px solid rgba(34,197,94,0.2); }
.hx-sync--off { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.28); }
.hx-families { display: flex; flex-wrap: wrap; gap: 6px; }
.hx-family { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09); color: rgba(240,244,255,0.82); }
.hx-family--live { background: rgba(34,197,94,0.1); border-color: rgba(34,197,94,0.3); color: #b6f2cf; }

/* ── Grilles supplémentaires ───────────────────────────────────────────── */
.hx-s8 { grid-column: span 8; } .hx-s6 { grid-column: span 6; } .hx-s4 { grid-column: span 4; }
@container (max-width: 860px) { .hx-s8, .hx-s4 { grid-column: span 12; } .hx-s6 { grid-column: span 12; } }
.hx-kgrid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.hx-k2 { grid-column: span 2; }
@container (max-width: 860px) { .hx-kgrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@container (max-width: 560px) { .hx-kgrid { gap: 12px; } }
.hx-ogrid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px; }
@container (max-width: 1000px) { .hx-ogrid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@container (max-width: 560px) { .hx-ogrid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; } }
.hx-wgrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: stretch; }
.hx-w2 { grid-column: span 2; }
@container (max-width: 1150px) { .hx-wgrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@container (max-width: 720px) { .hx-wgrid { grid-template-columns: minmax(0, 1fr); gap: 12px; } .hx-w2 { grid-column: span 1; } }
.hx-stack { display: flex; flex-direction: column; gap: 22px; }
.hx-section-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 8px 14px; margin-bottom: 14px; }
.hx-section-title { font-size: 19px; font-weight: 800; letter-spacing: -0.02em; margin: 0; color: #fff; }

/* ── Bannière de l'accueil ─────────────────────────────────────────────── */
.hx-banner { position: relative; overflow: hidden; border-radius: 24px; min-height: 190px; display: flex; flex-direction: column; justify-content: space-between; padding: 22px 26px; border: 1px solid rgba(140,160,255,0.1);
  background: radial-gradient(70% 120% at 100% 0%, rgba(124,108,240,0.35) 0%, rgba(124,108,240,0) 60%), radial-gradient(60% 120% at 0% 100%, rgba(31,156,198,0.22) 0%, rgba(31,156,198,0) 60%), linear-gradient(165deg, #18253f 0%, #0e1628 100%); }
.hx-banner img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.hx-banner::after { content: ''; position: absolute; inset: 0; background: linear-gradient(0deg, rgba(8,12,24,0.82) 0%, rgba(8,12,24,0.25) 55%, rgba(8,12,24,0.05) 100%); pointer-events: none; }
.hx-banner > * { position: relative; z-index: 1; }
.hx-banner-tools { align-self: stretch; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.hx-glass { display: inline-flex; align-items: center; gap: 7px; min-height: 36px; padding: 7px 13px; border-radius: 12px; font: inherit; font-size: 12.5px; font-weight: 700; color: rgba(255,255,255,0.9); background: rgba(10,16,30,0.45); border: 1px solid rgba(255,255,255,0.16); backdrop-filter: blur(10px); cursor: pointer; white-space: nowrap; }
.hx-glass:hover { background: rgba(10,16,30,0.62); }
.hx-glass--on { color: #fcd34d; border-color: rgba(245,158,11,0.4); }
.hx-glass--accent { background: linear-gradient(135deg, #8b7dff 0%, #5b47e0 100%); border: 0; color: #fff; }
.hx-banner-title { font-size: 32px; font-weight: 800; letter-spacing: -0.035em; line-height: 1.05; margin: 0; color: #fff; }
.hx-banner-sub { font-size: 14px; color: rgba(240,244,255,0.75); margin: 8px 0 0; }
.hx-chips { display: flex; flex-wrap: wrap; justify-content: flex-start; gap: 8px; margin-top: 14px; }
.hx-chip-alert { margin: 0; display: inline-flex; align-items: center; gap: 7px; padding: 6px 11px; border-radius: 999px; font: inherit; font-size: 12.5px; font-weight: 700; border: 1px solid transparent; cursor: pointer; text-decoration: none; }
@container (max-width: 560px) { .hx-banner { min-height: 170px; padding: 16px; border-radius: 20px; } .hx-banner-title { font-size: 25px; } .hx-glass span { display: none; } .hx-glass--stamp { display: none; } }

/* ── Chiffre principal ─────────────────────────────────────────────────── */
.hx-hero-figure { font-size: 42px; font-weight: 800; letter-spacing: -0.04em; line-height: 1; color: #fff; margin: 6px 0 0; }
@container (max-width: 560px) { .hx-hero-figure { font-size: 32px; } }
.hx-kpi-spark-bg { position: absolute; left: 0; right: 0; bottom: 0; height: 70px; opacity: 0.9; pointer-events: none; }

/* ── Widgets déplaçables ───────────────────────────────────────────────── */
.hx-widget { display: flex; flex-direction: column; min-height: 100%; }
.hx-widget[draggable="true"] { cursor: grab; outline: 1px dashed rgba(157,146,255,0.45); outline-offset: -1px; }
.hx-widget[data-dragging="true"] { opacity: 0.4; }
.hx-widget[data-over="true"] { outline: 2px solid #9d92ff; }
.hx-widget-tools { position: absolute; top: 10px; right: 10px; z-index: 2; display: flex; gap: 6px; }
.hx-icon-btn { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; font: inherit; color: rgba(240,244,255,0.8); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); cursor: pointer; }
.hx-icon-btn:hover { background: rgba(255,255,255,0.12); }
.hx-icon-btn--danger { color: #fca5a5; border-color: rgba(248,113,113,0.35); background: rgba(248,113,113,0.08); }
.hx-editbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; padding: 12px 14px; border-radius: 14px; background: rgba(139,125,255,0.08); border: 1px solid rgba(139,125,255,0.25); font-size: 13px; color: rgba(226,232,255,0.8); margin-bottom: 14px; }

/* ── Listes ────────────────────────────────────────────────────────────── */
.hx-rows { list-style: none; margin: 0; padding: 0; }
.hx-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 2px; }
.hx-row + .hx-row { border-top: 1px solid rgba(255,255,255,0.05); }
.hx-row--link { cursor: pointer; border-radius: 10px; padding-left: 8px; padding-right: 8px; }
.hx-row--link:hover { background: rgba(255,255,255,0.03); }
.hx-row-main { min-width: 0; flex: 1; }
.hx-row-title { font-size: 13.5px; font-weight: 600; color: rgba(244,247,255,0.92); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hx-row-sub { font-size: 12px; color: rgba(226,232,255,0.5); margin: 2px 0 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hx-row-value { font-size: 13.5px; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; color: #fff; }
.hx-rank { width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; font-size: 12px; font-weight: 800; flex-shrink: 0; }
.hx-tag { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 999px; font-size: 11.5px; font-weight: 700; white-space: nowrap; }
.hx-meters { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.hx-meter-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; font-size: 13px; margin-bottom: 6px; }
.hx-meter-head button, .hx-meter-head span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: rgba(240,244,255,0.85); background: none; border: 0; padding: 0; font: inherit; text-align: left; }
.hx-meter-head button { cursor: pointer; }
.hx-meter-head button:hover { color: #fff; text-decoration: underline; }
.hx-meter-track { height: 8px; border-radius: 4px; overflow: hidden; }
.hx-meter-fill { height: 100%; border-radius: 4px; }
.hx-empty { text-align: center; padding: 18px 8px; color: rgba(226,232,255,0.45); font-size: 13px; }
`;
