/*
 * Marquages d'une ligne Master Print : emplacement (cœur, dos, manche…),
 * technique, et taille — un format de la grille (Cœur 10x10, A4, A3) ou une
 * largeur libre en mm. Master Print facture au plus petit format qui contient
 * le marquage et revérifie les limites de l'emplacement.
 */
import { HiPlus, HiTrash } from 'react-icons/hi';
import type { MpMarking, MpProductView } from '@/@types/masterPrint';
import { Btn, Field, grid, input, muted } from './ui';

type Props = {
  view: MpProductView;
  markings: MpMarking[];
  onChange: (next: MpMarking[]) => void;
};

const FREE = '__libre__';

const MarkingsEditor = ({ view, markings, onChange }: Props) => {
  const m = view.markings;
  if (!m) return null;
  const used = new Set(markings.map((x) => x.position));
  const defaultTechnique = m.techniques[0]?.code || 'dtf';

  const set = (i: number, patch: Partial<MpMarking>) => {
    const next = markings.map((x, j) => (j === i ? { ...x, ...patch } : x));
    onChange(next);
  };

  const add = () => {
    const free = m.positions.find((p) => !used.has(p.code));
    onChange([
      ...markings,
      {
        position: free?.code || '',
        technique: defaultTechnique,
        format: m.formats[0]?.code,
      },
    ]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {!markings.length && (
        <p style={muted}>Aucun marquage : textile livré vierge.</p>
      )}
      {markings.map((mk, i) => {
        const pos = m.positions.find((p) => p.code === mk.position);
        const sizeValue = mk.format ? mk.format : FREE;
        return (
          <div
            key={i}
            style={{
              ...grid(150),
              alignItems: 'end',
              padding: '10px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Field title="Emplacement">
              <select
                style={input}
                value={mk.position}
                onChange={(e) => set(i, { position: e.target.value })}
              >
                <option value="">Choisir…</option>
                {m.positions.map((p) => (
                  <option
                    key={p.code}
                    value={p.code}
                    disabled={p.code !== mk.position && used.has(p.code)}
                  >
                    {p.label}
                    {p.maxWidthMm
                      ? ` (max ${p.maxWidthMm} × ${p.maxHeightMm} mm)`
                      : ''}
                  </option>
                ))}
              </select>
            </Field>
            {m.techniques.length > 1 && (
              <Field title="Technique">
                <select
                  style={input}
                  value={mk.technique}
                  onChange={(e) => set(i, { technique: e.target.value })}
                >
                  {m.techniques.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field title="Taille">
              <select
                style={input}
                value={sizeValue}
                onChange={(e) =>
                  e.target.value === FREE
                    ? set(i, {
                        format: undefined,
                        width_mm: mk.width_mm || pos?.maxWidthMm || 100,
                      })
                    : set(i, {
                        format: e.target.value,
                        width_mm: undefined,
                        height_mm: undefined,
                      })
                }
              >
                {m.formats.map((f) => (
                  <option key={f.code} value={f.code}>
                    {f.label}
                    {f.widthMm ? ` (${f.widthMm} × ${f.heightMm} mm)` : ''}
                  </option>
                ))}
                <option value={FREE}>Largeur libre…</option>
              </select>
            </Field>
            {sizeValue === FREE && (
              <Field title="Largeur (mm)">
                <input
                  style={input}
                  type="number"
                  min={10}
                  max={pos?.maxWidthMm || undefined}
                  value={mk.width_mm ?? ''}
                  onChange={(e) =>
                    set(i, {
                      width_mm: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </Field>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Btn
                variant="danger"
                onClick={() => onChange(markings.filter((_, j) => j !== i))}
                title="Retirer ce marquage"
              >
                <HiTrash aria-hidden="true" /> Retirer
              </Btn>
            </div>
          </div>
        );
      })}
      {markings.length < m.positions.length && (
        <div>
          <Btn onClick={add}>
            <HiPlus aria-hidden="true" /> Ajouter un marquage
          </Btn>
        </div>
      )}
    </div>
  );
};

export default MarkingsEditor;
