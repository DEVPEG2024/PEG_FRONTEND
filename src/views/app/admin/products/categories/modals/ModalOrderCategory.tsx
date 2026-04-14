import { useEffect, useRef, useState, useCallback } from 'react';
import { DragDropContext, Draggable, DropResult } from 'react-beautiful-dnd';
import { useTranslation } from 'react-i18next';
import { BsInboxFill } from 'react-icons/bs';
import { HiOutlineArrowDown, HiOutlineArrowUp, HiOutlineCheck, HiX } from 'react-icons/hi';
import classNames from 'classnames';
import { ProductCategory } from '@/@types/product';
import { Loading } from '@/components/shared';
import StrictModeDroppable from '@/components/shared/StrictModeDroppable';
import { Button } from '@/components/ui';
import { updateProductCategory, useAppDispatch } from '../store';
import { toast } from 'react-toastify';

function ModalOrderCategory({
  title,
  isOpen,
  categories,
  loading,
  handleCloseModal,
}: {
  title: string;
  isOpen: boolean;
  categories: ProductCategory[];
  loading: boolean;
  handleCloseModal: () => void;
}) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [orderedCategories, setOrderedCategories] = useState<ProductCategory[]>(
    []
  );
  const [lastMovedIndex, setLastMovedIndex] = useState<number | null>(null);
  const [moveDirection, setMoveDirection] = useState<'up' | 'down' | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const dragAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (categories) {
      setOrderedCategories([...categories]);
    }
  }, [categories]);

  // Auto-save debounced (800ms after last move)
  const triggerAutoSave = useCallback((newOrder: ProductCategory[]) => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    setSaved(false);
    autoSaveRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        await Promise.all(newOrder.map((cat, index) =>
          dispatch(updateProductCategory({ productCategory: { documentId: cat.documentId, name: cat.name, order: index }, imageModified: false }))
        ));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {
        toast.error('Erreur lors de la sauvegarde');
      } finally {
        setSaving(false);
      }
    }, 800);
  }, [dispatch]);

  useEffect(() => {
    if (lastMovedIndex !== null) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setLastMovedIndex(null);
        setMoveDirection(null);
      }, 1000);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [lastMovedIndex]);

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...orderedCategories];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index - 1];
    newOrder[index - 1] = temp;
    setOrderedCategories(newOrder);
    setLastMovedIndex(index - 1);
    setMoveDirection('up');
    triggerAutoSave(newOrder);
  };

  const moveDown = (index: number) => {
    if (index >= orderedCategories.length - 1) return;
    const newOrder = [...orderedCategories];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + 1];
    newOrder[index + 1] = temp;
    setOrderedCategories(newOrder);
    setLastMovedIndex(index + 1);
    setMoveDirection('down');
    triggerAutoSave(newOrder);
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source } = result;

    if (
      !destination ||
      (destination.droppableId === source.droppableId &&
        destination.index === source.index)
    ) {
      return;
    }

    const newOrder = [...orderedCategories];
    const [removed] = newOrder.splice(source.index, 1);
    newOrder.splice(destination.index, 0, removed);

    setOrderedCategories(newOrder);
    setLastMovedIndex(destination.index);
    setMoveDirection(destination.index > source.index ? 'down' : 'up');
    triggerAutoSave(newOrder);
  };

  const handleSaveOrder = async () => {
    try {
      const updatePromises = orderedCategories.map((category, index) => {
        return dispatch(
          updateProductCategory({
            productCategory: {
              documentId: category.documentId,
              name: category.name,
              order: index,
            },
            imageModified: false,
          })
        );
      });

      await Promise.all(updatePromises);
      handleCloseModal();
    } catch (error) {
      // Error handled silently
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      moveUp(index);
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      moveDown(index);
      e.preventDefault();
    }
  };

  const getDragStyle = (draggableStyle: any, snapshot: any) => {
    if (!snapshot.isDragging) return draggableStyle;

    return {
      ...draggableStyle,
      width: dragAreaRef.current
        ? `${dragAreaRef.current.offsetWidth - 16}px`
        : draggableStyle.width,
      left: 'auto',
      right: 'auto',
      margin: '0 auto',
    };
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes premiumFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes premiumSlideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          animation: 'premiumFadeIn 0.25s ease-out',
        }}
        onClick={handleCloseModal}
      >
        <div
          style={{
            position: 'relative',
            width: '90vw',
            maxWidth: 650,
            maxHeight: '90vh',
            background: 'linear-gradient(160deg, #1a2d47, #0f1c2e)',
            borderRadius: 20,
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'premiumSlideUp 0.35s ease-out',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleCloseModal}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 10,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.7)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
            }}
          >
            <HiX size={18} />
          </button>

          {/* Header */}
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#fff' }}>{title}</h4>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              {t(
                'cat.orderInstructions',
                'Utilisez les fleches pour reorganiser les categories ou glisser-deposer'
              )}
            </p>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
            <Loading loading={loading}>
              <DragDropContext onDragEnd={onDragEnd}>
                <div
                  className="grow overflow-y-auto max-h-96 custom-scrollbar pr-2"
                  ref={dragAreaRef}
                >
                  <StrictModeDroppable
                    droppableId="categories"
                    direction="vertical"
                  >
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="relative"
                      >
                        {orderedCategories.map((category, index) => (
                          <Draggable
                            key={category.documentId}
                            draggableId={category.documentId}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                style={getDragStyle(
                                  provided.draggableProps.style,
                                  snapshot
                                )}
                                className={classNames(
                                  'flex items-center justify-between p-3 mb-3 bg-white/5 border border-white/10 rounded-md hover:bg-white/10 order-category-item',
                                  {
                                    'moved-up':
                                      lastMovedIndex === index &&
                                      moveDirection === 'up',
                                    'moved-down':
                                      lastMovedIndex === index &&
                                      moveDirection === 'down',
                                    'shadow-md bg-white/10 z-50 drag-item-clone':
                                      snapshot.isDragging,
                                  }
                                )}
                                tabIndex={0}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                              >
                                <div
                                  className="flex items-center flex-1 min-w-0 cursor-grab"
                                  {...provided.dragHandleProps}
                                >
                                  <div className="order-number mr-3 shrink-0 text-white/60">
                                    {index + 1}
                                  </div>
                                  {category.image && (
                                    <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden mr-3 shrink-0 bg-white/5">
                                      <img
                                        src={category.image.url}
                                        alt={category.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src =
                                            '/img/others/placeholder.png';
                                        }}
                                      />
                                    </div>
                                  )}
                                  <span className="font-medium text-white truncate">
                                    {category.name}
                                  </span>
                                </div>
                                <div className="flex space-x-1 shrink-0">
                                  <button
                                    onClick={() => moveUp(index)}
                                    disabled={index === 0}
                                    className={classNames(
                                      'p-2 rounded-md arrow-button',
                                      {
                                        'text-white/20 cursor-not-allowed':
                                          index === 0,
                                        'text-white/70': index !== 0,
                                      }
                                    )}
                                    title={t('moveUp', 'Move up')}
                                    aria-label={t('moveUp', 'Move up')}
                                  >
                                    <HiOutlineArrowUp size={18} />
                                  </button>
                                  <button
                                    onClick={() => moveDown(index)}
                                    disabled={
                                      index === orderedCategories.length - 1
                                    }
                                    className={classNames(
                                      'p-2 rounded-md arrow-button',
                                      {
                                        'text-white/20 cursor-not-allowed':
                                          index === orderedCategories.length - 1,
                                        'text-white/70':
                                          index !== orderedCategories.length - 1,
                                      }
                                    )}
                                    title={t('moveDown', 'Move down')}
                                    aria-label={t('moveDown', 'Move down')}
                                  >
                                    <HiOutlineArrowDown size={18} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </StrictModeDroppable>
                  {orderedCategories.length === 0 && !loading && (
                    <div className="empty-list-container text-white/40">
                      <BsInboxFill size={40} className="mb-3" />
                      <p className="text-white/40">
                        {t('cat.noCategories', 'Aucune categorie a reorganiser')}
                      </p>
                    </div>
                  )}
                </div>
              </DragDropContext>
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/[0.06]">
                <div className="text-xs text-white/40 flex items-center gap-1.5">
                  {saving && <span className="text-cyan-400">Sauvegarde...</span>}
                  {saved && <span className="text-emerald-400 flex items-center gap-1"><HiOutlineCheck size={14} /> Sauvegarde</span>}
                  {!saving && !saved && <span>Sauvegarde automatique</span>}
                </div>
                <Button variant="plain" onClick={handleCloseModal}>
                  Fermer
                </Button>
              </div>
            </Loading>
          </div>
        </div>
      </div>
    </>
  );
}

export default ModalOrderCategory;
