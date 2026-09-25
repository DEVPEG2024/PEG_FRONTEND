import { useEffect, useId, useLayoutEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import {
  AnimatePresence,
  Reorder,
  motion,
  useDragControls,
  useReducedMotion,
} from 'framer-motion';
import { HiMinus, HiPlus } from 'react-icons/hi';
import { MdDragIndicator } from 'react-icons/md';
import navigationIcon from '@/configs/navigation-icon.config';
import type { DockEntry } from '@/utils/navMenu';

/*
 * Réglage de la barre d'onglets du téléphone (MobileDock.tsx) : quels onglets,
 * dans quel ordre. La feuille sort de derrière la barre, qui reste visible
 * au-dessus d'elle : chaque changement s'y voit aussitôt, rien à enregistrer.
 * Styles : section « BARRE D'ONGLETS » de _mobile.css.
 */

type Props = {
  open: boolean;
  /** Tout ce qui peut aller dans la barre, dans l'ordre du menu */
  entries: DockEntry[];
  tabs: DockEntry[];
  isCustom: boolean;
  /** Onglet d'où l'on vient (appui long) : sa ligne est mise en évidence */
  focusKey?: string;
  /** revealKey : onglet à faire apparaître dans la barre */
  onChange: (keys: string[], revealKey?: string) => void;
  onReset: () => void;
  onClose: () => void;
};

const SHEET_SPRING = { type: 'spring', stiffness: 420, damping: 40 } as const;

// Sous-page : sa catégorie. Catégorie : les pages qu'elle ouvre.
const captionOf = (entry: DockEntry) =>
  entry.group ?? entry.pages?.map((p) => p.title).join(', ');

const EntryLabel = ({ entry }: { entry: DockEntry }) => {
  const caption = captionOf(entry);
  return (
    <>
      <span className="peg-dock-sheet-icon" aria-hidden="true">
        {navigationIcon[entry.icon]}
      </span>
      <span className="peg-dock-sheet-text">
        <span className="peg-dock-sheet-title">{entry.title}</span>
        {caption && <span className="peg-dock-sheet-caption">{caption}</span>}
      </span>
    </>
  );
};

type TabRowProps = {
  entry: DockEntry;
  index: number;
  canRemove: boolean;
  flash: boolean;
  onRemove: (key: string) => void;
  onMove: (index: number, step: -1 | 1) => void;
  onDrop: (key: string) => void;
};

const TabRow = ({
  entry,
  index,
  canRemove,
  flash,
  onRemove,
  onMove,
  onDrop,
}: TabRowProps) => {
  const controls = useDragControls();
  const onHandleKey = (e: ReactKeyboardEvent) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    onMove(index, e.key === 'ArrowUp' ? -1 : 1);
  };
  return (
    <Reorder.Item
      as="li"
      value={entry.key}
      data-key={entry.key}
      dragListener={false}
      dragControls={controls}
      onDragEnd={() => onDrop(entry.key)}
      className={classNames('peg-dock-sheet-row', flash && 'is-flash')}
      whileDrag={{
        scale: 1.03,
        backgroundColor: 'rgba(38, 50, 74, 1)',
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
      }}
    >
      <button
        type="button"
        className="peg-dock-sheet-toggle"
        disabled={!canRemove}
        aria-label={`Retirer « ${entry.title} » de la barre`}
        onClick={() => onRemove(entry.key)}
      >
        <span className="peg-dock-sheet-dot is-remove" aria-hidden="true">
          <HiMinus />
        </span>
      </button>
      <EntryLabel entry={entry} />
      <button
        type="button"
        className="peg-dock-sheet-handle"
        aria-label={`Déplacer « ${entry.title} » (flèches haut et bas)`}
        onPointerDown={(e) => {
          e.preventDefault();
          controls.start(e);
        }}
        onKeyDown={onHandleKey}
      >
        <MdDragIndicator aria-hidden="true" />
      </button>
    </Reorder.Item>
  );
};

const MobileDockEditor = ({
  open,
  entries,
  tabs,
  isCustom,
  focusKey,
  onChange,
  onReset,
  onClose,
}: Props) => {
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const sheetRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const sheetDrag = useDragControls();
  // Poignée à refocaliser après un déplacement au clavier (la ligne change de place)
  const refocusKey = useRef<string | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const keys = tabs.map((t) => t.key);
  const others = entries.filter((e) => !keys.includes(e.key));

  // Clavier : focus dans la feuille, Échap la ferme, Tab y reste ; à la
  // fermeture, le focus revient là où il était.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    sheetRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      const sheet = sheetRef.current;
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !sheet) return;
      const focusables = Array.from(
        sheet.querySelectorAll<HTMLElement>('button:not(:disabled)')
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement;
      if (e.shiftKey && (current === first || current === sheet)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus?.({ preventScroll: true });
    };
  }, [open]);

  // Venu d'un appui long : la ligne de l'onglet est amenée à l'écran
  useLayoutEffect(() => {
    if (!open || !focusKey) return;
    const body = bodyRef.current;
    const row = body?.querySelector<HTMLElement>(
      `[data-key="${CSS.escape(focusKey)}"]`
    );
    if (body && row) {
      body.scrollTop =
        row.offsetTop - (body.clientHeight - row.offsetHeight) / 2;
    }
  }, [open, focusKey]);

  useEffect(() => {
    const key = refocusKey.current;
    if (!key) return;
    refocusKey.current = null;
    bodyRef.current
      ?.querySelector<HTMLElement>(
        `[data-key="${CSS.escape(key)}"] .peg-dock-sheet-handle`
      )
      ?.focus({ preventScroll: false });
  });

  const remove = (key: string) => {
    if (keys.length > 1) onChange(keys.filter((k) => k !== key));
  };
  const add = (key: string) => onChange([...keys, key], key);
  const move = (index: number, step: -1 | 1) => {
    const target = index + step;
    if (target < 0 || target >= keys.length) return;
    const next = [...keys];
    [next[index], next[target]] = [next[target], next[index]];
    refocusKey.current = next[target];
    onChange(next, next[target]);
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="scrim"
          className="peg-dock-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          onClick={onClose}
        />
      )}
      {open && (
        <motion.section
          key="sheet"
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="peg-dock-sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={reduceMotion ? { duration: 0 } : SHEET_SPRING}
          drag="y"
          dragListener={false}
          dragControls={sheetDrag}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.9 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 90 || info.velocity.y > 600) onClose();
          }}
        >
          {/* Tirer l'en-tête vers le bas referme la feuille */}
          <div
            className="peg-dock-sheet-head"
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest('button')) return;
              sheetDrag.start(e);
            }}
          >
            <span className="peg-dock-sheet-grabber" aria-hidden="true" />
            <div className="peg-dock-sheet-headrow">
              <h2 id={titleId}>Barre du bas</h2>
              <button
                type="button"
                className="peg-dock-sheet-done"
                onClick={onClose}
              >
                OK
              </button>
            </div>
            <p className="peg-dock-sheet-intro">
              Vos onglets, dans votre ordre. Faites glisser la barre sur le côté
              pour voir les suivants.
            </p>
          </div>

          <motion.div
            ref={bodyRef}
            className="peg-dock-sheet-body"
            layoutScroll
          >
            <h3 className="peg-dock-sheet-section">
              Dans la barre
              <span className="peg-dock-sheet-count">{tabs.length}</span>
            </h3>
            <Reorder.Group
              as="ul"
              axis="y"
              values={keys}
              onReorder={(next: string[]) => onChange(next)}
              className="peg-dock-sheet-list"
            >
              {tabs.map((entry, index) => (
                <TabRow
                  key={entry.key}
                  entry={entry}
                  index={index}
                  canRemove={tabs.length > 1}
                  flash={entry.key === focusKey}
                  onRemove={remove}
                  onMove={move}
                  onDrop={(key) => onChange(keys, key)}
                />
              ))}
            </Reorder.Group>

            {others.length > 0 && (
              <>
                <h3 className="peg-dock-sheet-section">Autres pages</h3>
                <ul className="peg-dock-sheet-list">
                  {others.map((entry) => (
                    <motion.li
                      key={entry.key}
                      layout="position"
                      data-key={entry.key}
                    >
                      <button
                        type="button"
                        className="peg-dock-sheet-row peg-dock-sheet-add"
                        aria-label={`Ajouter « ${entry.title} » à la barre`}
                        onClick={() => add(entry.key)}
                      >
                        <span
                          className="peg-dock-sheet-dot is-add"
                          aria-hidden="true"
                        >
                          <HiPlus />
                        </span>
                        <EntryLabel entry={entry} />
                      </button>
                    </motion.li>
                  ))}
                </ul>
              </>
            )}

            <button
              type="button"
              className="peg-dock-sheet-reset"
              disabled={!isCustom}
              onClick={onReset}
            >
              Rétablir la barre d&apos;origine
            </button>
          </motion.div>
        </motion.section>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default MobileDockEditor;
