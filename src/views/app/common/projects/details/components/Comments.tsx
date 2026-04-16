import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Container from '@/components/shared/Container';
import { HiOutlineSearch, HiPaperAirplane, HiPhotograph, HiX, HiPhone } from 'react-icons/hi';
import { Comment } from '@/@types/project';
import DetailsRight from './DetailsRight';
import {
  RootState,
  useAppDispatch,
  useAppSelector as useRootAppSelector,
} from '@/store';
import { createComment, setLoading, useAppSelector } from '../store';
import { User } from '@/@types/user';
import { PegFile } from '@/@types/pegFile';
import { apiUploadFile } from '@/services/FileServices';
import { ADMIN, SUPER_ADMIN } from '@/constants/roles.constant';
import { hasRole } from '@/utils/permissions';
import ChatMessage from './ChatMessage';

/* ── Visibility options ── */
const VISIBILITY_OPTIONS = [
  { value: 'all',      label: 'Tous',       color: '#6b9eff', bg: 'rgba(47,111,237,0.12)', border: 'rgba(47,111,237,0.25)', icon: '🌐' },
  { value: 'customer', label: 'Client',     color: '#fbbf24', bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.25)',  icon: '👤' },
  { value: 'producer', label: 'Producteur', color: '#a78bfa', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.25)', icon: '🔧' },
];

/* ── CSS keyframes injected once ── */
const styleId = 'peg-chat-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes chatFadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes chatPulse {
      0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
      40% { opacity: 1; transform: scale(1); }
    }
    .peg-chat-scroll::-webkit-scrollbar { width: 5px; }
    .peg-chat-scroll::-webkit-scrollbar-track { background: transparent; }
    .peg-chat-scroll::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.08);
      border-radius: 10px;
    }
    .peg-chat-scroll::-webkit-scrollbar-thumb:hover {
      background: rgba(255,255,255,0.15);
    }
  `;
  document.head.appendChild(style);
}

/* ── Date separator helper ── */
const formatDateSeparator = (date: Date): string => {
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) return "Aujourd'hui";
  if (isYesterday) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};

/* ── Main component ── */
const Comments = () => {
  const [commentText, setCommentText] = useState('');
  const [visibility, setVisibility] = useState('all');
  const [pegFiles, setPegFiles] = useState<PegFile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const dispatch = useAppDispatch();
  const { user }: { user: User } = useRootAppSelector(
    (state: RootState) => state.auth.user
  );
  const { project, comments, loading } = useAppSelector(
    (state) => state.projectDetails.data
  );

  const isAdmin = hasRole(user, [SUPER_ADMIN, ADMIN]);
  const activeVis = VISIBILITY_OPTIONS.find(o => o.value === visibility) ?? VISIBILITY_OPTIONS[0];

  /* ── Auto scroll ── */
  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      const container = chatContainerRef.current;
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: smooth ? 'smooth' : 'instant',
        });
      }
    });
  }, []);

  // Scroll au dernier message à chaque chargement des commentaires
  useEffect(() => {
    if (comments.length > 0) {
      // Double rAF pour s'assurer que le DOM est peint
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollToBottom(false));
      });
    }
  }, [comments.length > 0, scrollToBottom]);

  // Scroll smooth à chaque nouveau message
  const prevCount = useRef(0);
  useEffect(() => {
    if (prevCount.current > 0 && comments.length > prevCount.current) {
      scrollToBottom(true);
    }
    prevCount.current = comments.length;
  }, [comments.length, scrollToBottom]);

  /* ── Visibility filtering ── */
  const determineVisibleComments = (comments: Comment[], user: User): Comment[] => {
    if (hasRole(user, [SUPER_ADMIN, ADMIN])) return comments;
    return comments.filter(
      ({ visibility }) => visibility === 'all' || visibility === user.role.name
    );
  };

  const visibleComments = useMemo(() => determineVisibleComments(comments, user), [comments, user]);
  const filteredComments = useMemo(() => {
    if (!searchTerm.trim()) return visibleComments;
    const term = searchTerm.toLowerCase();
    return visibleComments.filter((c) =>
      c.content?.toLowerCase().includes(term) ||
      c.user?.firstName?.toLowerCase().includes(term) ||
      c.user?.lastName?.toLowerCase().includes(term)
    );
  }, [visibleComments, searchTerm]);

  /* ── Group messages for avatar/name display ── */
  const getMessageGroups = (messages: Comment[]) => {
    return messages.map((msg, i) => {
      const prev = i > 0 ? messages[i - 1] : null;
      const next = i < messages.length - 1 ? messages[i + 1] : null;
      const sameUserAsPrev = prev?.user?.documentId === msg.user?.documentId;
      const sameUserAsNext = next?.user?.documentId === msg.user?.documentId;

      // Show date separator
      const showDateSep = !prev || new Date(prev.createdAt).toDateString() !== new Date(msg.createdAt).toDateString();

      // Time gap > 5min → new group
      const timeGap = prev ? (new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime()) : Infinity;
      const newGroup = timeGap > 5 * 60 * 1000;

      const showAvatar = !sameUserAsNext || (next && new Date(next.createdAt).getTime() - new Date(msg.createdAt).getTime() > 5 * 60 * 1000);
      const showName = !sameUserAsPrev || newGroup || showDateSep;

      return { msg, showAvatar: !!showAvatar, showName, showDateSep };
    });
  };

  const grouped = useMemo(() => getMessageGroups(filteredComments), [filteredComments]);

  /* ── Submit ── */
  const submitComment = async () => {
    if (!commentText.trim() && pegFiles.length === 0) return;

    const newPegFiles: PegFile[] = [];
    dispatch(setLoading(true));

    for (const pegFile of pegFiles) {
      if (pegFile.id) {
        newPegFiles.push(pegFile);
      } else {
        const pegFileUploaded: PegFile = await apiUploadFile(pegFile.file);
        newPegFiles.push(pegFileUploaded);
      }
    }

    const commentVisibility =
      user.role.name === 'customer'
        ? 'customer'
        : user.role.name === 'producer'
          ? 'producer'
          : visibility;

    const comment = {
      content: commentText,
      user: user,
      images: newPegFiles.map(({ id }) => id),
      visibility: commentVisibility,
    } as any;

    dispatch(createComment({ comment, project }));
    setCommentText('');
    setPegFiles([]);
  };

  /* ── File handlers ── */
  const allowedFileTypes = [
    'image/jpeg', 'image/png', 'image/jpg', 'image/webp',
    'application/pdf', 'application/x-pdf',
    'application/zip', 'application/x-zip-compressed',
    'image/vnd.adobe.photoshop', 'application/postscript', 'application/illustrator',
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remaining = 4 - pegFiles.length;
    for (let i = 0; i < Math.min(files.length, remaining); i++) {
      const file = files[i];
      if (allowedFileTypes.includes(file.type)) {
        setPegFiles((prev) => [...prev, { file, name: file.name } as PegFile]);
      }
    }
    e.target.value = '';
  };

  const removeFile = (idx: number) => {
    setPegFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  /* ── Empty state ── */
  const EmptyChat = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: '12px',
      opacity: 0.5,
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: 'rgba(47,111,237,0.1)',
        border: '1px solid rgba(47,111,237,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
      }}>
        💬
      </div>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 500 }}>
        Aucun message pour le moment
      </p>
      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px' }}>
        Envoyez le premier message
      </p>
    </div>
  );

  return (
    <Container className="h-full">
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '20px',
        paddingTop: '20px',
        paddingBottom: '20px',
        fontFamily: 'Inter, sans-serif',
      }}>
        {/* ── Chat panel ── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
          borderRadius: '18px',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
          overflow: 'hidden',
          minHeight: '500px',
          maxHeight: '75vh',
        }}>
          {/* ── Header ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.03)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#4ade80',
                boxShadow: '0 0 8px rgba(74,222,128,0.4)',
              }} />
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', fontWeight: 600 }}>
                Messages
              </span>
              <span style={{
                color: 'rgba(255,255,255,0.3)',
                fontSize: '12px',
                fontWeight: 500,
              }}>
                {visibleComments.length}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* WhatsApp button — client only */}
              {!isAdmin && (
                <a
                  href={`https://wa.me/33659252823?text=${encodeURIComponent(`Bonjour, je suis ${user?.firstName ?? ''} ${user?.lastName ?? ''} (${project?.customer?.name ?? ''}), je vous contacte au sujet du projet "${project?.name ?? ''}"`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 12px',
                    borderRadius: '8px',
                    background: 'rgba(37,211,102,0.12)',
                    border: '1px solid rgba(37,211,102,0.25)',
                    color: '#25d366',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textDecoration: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    fontFamily: 'Inter, sans-serif',
                  }}
                  title="Nous contacter sur WhatsApp"
                >
                  <HiPhone size={13} />
                  WhatsApp
                </a>
              )}
              {/* Search toggle */}
              <button
                onClick={() => { setSearchOpen(!searchOpen); setSearchTerm(''); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: searchOpen ? 'rgba(47,111,237,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${searchOpen ? 'rgba(47,111,237,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  color: searchOpen ? '#6b9eff' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <HiOutlineSearch size={14} />
              </button>
            </div>
          </div>

          {/* ── Search bar (collapsible) ── */}
          {searchOpen && (
            <div style={{
              padding: '8px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              background: 'rgba(0,0,0,0.15)',
              animation: 'chatFadeIn 0.2s ease-out',
              flexShrink: 0,
            }}>
              <div style={{ position: 'relative' }}>
                <HiOutlineSearch size={13} style={{
                  position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                  color: 'rgba(255,255,255,0.2)', pointerEvents: 'none',
                }} />
                <input
                  autoFocus
                  type="text"
                  placeholder="Rechercher dans la conversation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '7px 10px 7px 32px',
                    color: '#fff',
                    fontSize: '12px',
                    fontFamily: 'Inter, sans-serif',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(47,111,237,0.3)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
                {searchTerm && (
                  <span style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    color: 'rgba(255,255,255,0.3)', fontSize: '10px',
                  }}>
                    {filteredComments.length} résultat{filteredComments.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ── Messages area ── */}
          <div
            ref={chatContainerRef}
            className="peg-chat-scroll"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 16px 8px 16px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {filteredComments.length === 0 ? (
              <EmptyChat />
            ) : (
              grouped.map(({ msg, showAvatar, showName, showDateSep }) => (
                <div key={msg.documentId}>
                  {/* Date separator */}
                  {showDateSep && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      margin: '16px 0 12px',
                    }}>
                      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                      <span style={{
                        color: 'rgba(255,255,255,0.25)',
                        fontSize: '10px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        whiteSpace: 'nowrap',
                      }}>
                        {formatDateSeparator(msg.createdAt)}
                      </span>
                      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                    </div>
                  )}
                  <ChatMessage
                    comment={msg}
                    currentUser={user}
                    isOwn={msg.user?.documentId === user?.documentId}
                    showAvatar={showAvatar}
                    showName={showName}
                  />
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Input area ── */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.03)',
            padding: '12px 16px',
            flexShrink: 0,
          }}>
            {/* Visibility selector — admin only */}
            {isAdmin && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginBottom: '10px',
              }}>
                <span style={{
                  color: 'rgba(255,255,255,0.3)',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  marginRight: '4px',
                }}>
                  Envoyer à
                </span>
                {VISIBILITY_OPTIONS.map((opt) => {
                  const isActive = visibility === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setVisibility(opt.value)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 10px',
                        borderRadius: '100px',
                        border: `1px solid ${isActive ? opt.border : 'rgba(255,255,255,0.06)'}`,
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 600,
                        fontFamily: 'Inter, sans-serif',
                        background: isActive ? opt.bg : 'transparent',
                        color: isActive ? opt.color : 'rgba(255,255,255,0.35)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '10px' }}>{opt.icon}</span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* File thumbnails */}
            {pegFiles.length > 0 && (
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '10px',
                flexWrap: 'wrap',
              }}>
                {pegFiles.map((pf, idx) => (
                  <div key={idx} style={{
                    position: 'relative',
                    width: '56px',
                    height: '56px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.04)',
                  }}>
                    {pf.file?.type?.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(pf.file)}
                        alt={pf.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'rgba(255,255,255,0.4)', fontSize: '9px', fontWeight: 600,
                        textAlign: 'center', padding: '4px', wordBreak: 'break-all',
                      }}>
                        {pf.name?.split('.').pop()?.toUpperCase()}
                      </div>
                    )}
                    <button
                      onClick={() => removeFile(idx)}
                      style={{
                        position: 'absolute', top: '2px', right: '2px',
                        width: '16px', height: '16px', borderRadius: '50%',
                        background: 'rgba(0,0,0,0.7)', border: 'none',
                        color: '#fff', fontSize: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <HiX size={8} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf,application/zip,.psd,.ai"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />

            {/* Input row */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '8px',
            }}>
              {/* Photo button — opens native file picker */}
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: pegFiles.length > 0 ? 'rgba(47,111,237,0.12)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${pegFiles.length > 0 ? 'rgba(47,111,237,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  color: pegFiles.length > 0 ? '#6b9eff' : 'rgba(255,255,255,0.4)',
                  cursor: pegFiles.length >= 4 ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                  opacity: pegFiles.length >= 4 ? 0.4 : 1,
                }}
                disabled={pegFiles.length >= 4}
                title={pegFiles.length >= 4 ? 'Maximum 4 fichiers' : 'Ajouter une photo'}
              >
                <HiPhotograph size={16} />
              </button>

              {/* Text input */}
              <textarea
                placeholder="Votre message..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitComment();
                  }
                }}
                rows={1}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding: '9px 14px',
                  color: '#fff',
                  fontSize: '13px',
                  fontFamily: 'Inter, sans-serif',
                  outline: 'none',
                  resize: 'none',
                  minHeight: '36px',
                  maxHeight: '120px',
                  lineHeight: '1.4',
                  transition: 'border-color 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(47,111,237,0.3)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 120) + 'px';
                }}
              />

              {/* Send button */}
              <button
                onClick={submitComment}
                disabled={loading || (!commentText.trim() && pegFiles.length === 0)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: (commentText.trim() || pegFiles.length > 0)
                    ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                    : 'rgba(255,255,255,0.04)',
                  border: 'none',
                  color: (commentText.trim() || pegFiles.length > 0)
                    ? '#fff'
                    : 'rgba(255,255,255,0.2)',
                  cursor: (commentText.trim() || pegFiles.length > 0) ? 'pointer' : 'default',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                  boxShadow: (commentText.trim() || pegFiles.length > 0)
                    ? '0 2px 12px rgba(37,99,235,0.3)'
                    : 'none',
                  transform: (commentText.trim() || pegFiles.length > 0) ? 'scale(1)' : 'scale(0.95)',
                }}
                title="Envoyer"
              >
                {loading ? (
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        style={{
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          background: '#fff',
                          animation: `chatPulse 1.2s ease-in-out ${i * 0.15}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <HiPaperAirplane size={16} style={{ transform: 'rotate(90deg)' }} />
                )}
              </button>
            </div>

            {/* Active visibility indicator for admin */}
            {isAdmin && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '6px',
                paddingLeft: '44px',
              }}>
                <span style={{ fontSize: '9px', color: activeVis.color, fontWeight: 500 }}>
                  {activeVis.icon} Envoi vers : {activeVis.label}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <DetailsRight />
      </div>
    </Container>
  );
};

export default Comments;
