/**
 * Rendu markdown léger des réponses du chatbot (widget client, aperçu et
 * historique admin). Le texte est toujours rendu par React (échappé) ; seuls les
 * liens http(s) deviennent des <a>. Aucun HTML brut n'est interprété.
 */

import ChatCardView, { type ChatCard } from '@/components/template/ChatCardView';

const LINK_STYLE = { color: '#6b9eff', textDecoration: 'underline', wordBreak: 'break-word' as const };

// Le texte est toujours rendu par React (échappé) ; seuls les liens http(s)
// deviennent des <a>. Supporte ce que produit le modèle : **gras**, *italique*,
// _italique_, `code`, liens, listes à puces et numérotées, titres, tableaux.

export const renderInline = (text: string, keyBase: string): (string | JSX.Element)[] => {
  // Pas de lookbehind (?<=…) : non supporté avant Safari 16.4 → erreur de syntaxe
  // qui ferait tomber tout le bundle. `\b_…_\b` n'italique pas les noms_de_fichier.
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s\]>)]+)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*\s][^*]*)\*|\b_([^_\n]+)_\b/g;
  const out: (string | JSX.Element)[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyBase}-${i++}`;
    if (m[1] !== undefined) out.push(<a key={key} href={m[2]} target="_blank" rel="noopener noreferrer" style={LINK_STYLE}>{m[1]}</a>);
    else if (m[3] !== undefined) out.push(<a key={key} href={m[3]} target="_blank" rel="noopener noreferrer" style={LINK_STYLE}>{m[3]}</a>);
    else if (m[4] !== undefined) out.push(<strong key={key} style={{ fontWeight: 700, color: '#fff' }}>{m[4]}</strong>);
    else if (m[5] !== undefined) out.push(<code key={key} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '4px', padding: '0 4px', fontSize: '12px' }}>{m[5]}</code>);
    else if (m[6] !== undefined) out.push(<em key={key} style={{ opacity: 0.85 }}>{m[6]}</em>);
    else if (m[7] !== undefined) out.push(<em key={key} style={{ opacity: 0.85 }}>{m[7]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length ? out : [text];
};

const splitRow = (line: string): string[] =>
  line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
const isTableSeparator = (line: string): boolean => /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(line.trim());

type RenderOptions = {
  /** Cartes fournies par le serveur : un lien [Nom](url) SEUL sur sa ligne dont l'url y figure devient une carte. */
  cards?: ChatCard[];
  /** Navigation interne (sans rechargement) quand une carte pointe vers l'application. */
  onNavigate?: (path: string) => void;
};

// Lien seul sur sa ligne, éventuellement en gras ou suivi d'une ponctuation.
const SOLO_LINK_RE = /^(?:\*\*)?\[[^\]]+\]\((https?:\/\/[^)\s]+)\)(?:\*\*)?\s*[.,;:!]?$/;

export const renderChatMarkdown = (content: string, opts: RenderOptions = {}): JSX.Element[] => {
  const lines = (content || '').split('\n');
  const blocks: JSX.Element[] = [];
  const cardByUrl = new Map((opts.cards || []).map((c) => [c.url, c]));
  const soloCard = (text: string): ChatCard | null => {
    if (!cardByUrl.size) return null;
    const m = SOLO_LINK_RE.exec(text.trim());
    return m ? cardByUrl.get(m[1]) ?? null : null;
  };
  let list: { ordered: boolean; items: JSX.Element[] } | null = null;
  const flushList = () => {
    if (!list) return;
    const style = { margin: '4px 0', paddingLeft: '18px', display: 'flex', flexDirection: 'column' as const, gap: '2px' };
    blocks.push(list.ordered
      ? <ol key={`ol-${blocks.length}`} style={{ ...style, listStyle: 'decimal' }}>{list.items}</ol>
      : <ul key={`ul-${blocks.length}`} style={{ ...style, listStyle: 'disc' }}>{list.items}</ul>);
    list = null;
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const t = line.trim();

    // Tableau : ligne d'en-tête + séparateur |---|---|
    if (t.startsWith('|') && idx + 1 < lines.length && isTableSeparator(lines[idx + 1])) {
      flushList();
      const header = splitRow(t);
      const rows: string[][] = [];
      idx += 2;
      while (idx < lines.length && lines[idx].trim().startsWith('|')) { rows.push(splitRow(lines[idx])); idx++; }
      idx--;
      const cell = { padding: '4px 6px', borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' as const, verticalAlign: 'top' as const };
      blocks.push(
        <div key={`tbl-${idx}`} style={{ overflowX: 'auto', margin: '4px 0' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '12px', minWidth: '100%', whiteSpace: 'normal' }}>
            <thead><tr>{header.map((h, hi) => <th key={hi} style={{ ...cell, color: '#fff', fontWeight: 700 }}>{renderInline(h, `th-${idx}-${hi}`)}</th>)}</tr></thead>
            <tbody>{rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci} style={cell}>{renderInline(c, `td-${idx}-${ri}-${ci}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }

    const bullet = /^(?:[-*•])\s+(.*)$/.exec(t);
    const numbered = /^(\d+)[.)]\s+(.*)$/.exec(t);
    const card = soloCard(bullet ? bullet[1] : numbered ? numbered[2] : t);
    if (card) {
      flushList();
      blocks.push(<ChatCardView key={`card-${idx}`} card={card} onNavigate={opts.onNavigate} />);
      continue;
    }
    if (bullet || numbered) {
      const ordered = !!numbered && !bullet;
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push(<li key={`li-${idx}`}>{renderInline(bullet ? bullet[1] : numbered![2], `li-${idx}`)}</li>);
      continue;
    }
    flushList();
    if (t === '') { blocks.push(<div key={`sp-${idx}`} style={{ height: '5px' }} />); continue; }
    const heading = /^#{1,6}\s+(.*)$/.exec(t);
    if (heading) {
      blocks.push(<div key={`h-${idx}`} style={{ margin: '4px 0 2px', fontWeight: 700, color: '#fff' }}>{renderInline(heading[1], `h-${idx}`)}</div>);
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { blocks.push(<div key={`hr-${idx}`} style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '6px 0' }} />); continue; }
    blocks.push(<div key={`p-${idx}`} style={{ margin: '1px 0' }}>{renderInline(line, `p-${idx}`)}</div>);
  }
  flushList();
  return blocks.length ? blocks : [<span key="0">{content}</span>];
};
