import { useState } from 'react';
import { Comment } from '@/@types/project';
import { User } from '@/@types/user';
import { PegFile } from '@/@types/pegFile';
import { HiUserCircle, HiTrash, HiExclamation, HiDownload } from 'react-icons/hi';
import { Avatar, Tooltip } from '@/components/ui';
import { useAppDispatch } from '@/store';
import { deleteComment } from '../store';
import { apiDeleteFile, apiLoadPegFilesAndFiles } from '@/services/FileServices';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN } from '@/constants/roles.constant';
import { safeHtmlParse } from '@/utils/sanitizeHtml';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';

dayjs.extend(relativeTime);
dayjs.locale('fr');

const visibilityConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  all:      { label: 'Tous',       color: '#6b9eff', bg: 'rgba(47,111,237,0.10)',  border: 'rgba(47,111,237,0.20)', icon: '🌐' },
  customer: { label: 'Client',     color: '#fbbf24', bg: 'rgba(234,179,8,0.10)',   border: 'rgba(234,179,8,0.20)',  icon: '👤' },
  producer: { label: 'Producteur', color: '#a78bfa', bg: 'rgba(139,92,246,0.10)',  border: 'rgba(139,92,246,0.20)', icon: '🔧' },
  admin:    { label: 'Admin',      color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.15)', icon: '🔒' },
};

type ChatMessageProps = {
  comment: Comment;
  currentUser: User;
  isOwn: boolean;
  showAvatar: boolean;
  showName: boolean;
};

const ChatMessage = ({ comment, currentUser, isOwn, showAvatar, showName }: ChatMessageProps) => {
  const dispatch = useAppDispatch();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hovered, setHovered] = useState(false);

  const isAdmin = hasRole(currentUser, [ADMIN, SUPER_ADMIN]);
  const canDelete = isAdmin || isOwn;

  const authorName = comment.user
    ? `${comment.user.firstName} ${comment.user.lastName}`
    : 'Utilisateur supprimé';

  const roleName = comment.user?.role?.name;
  const roleLabel =
    roleName === 'customer' ? 'Client'
    : roleName === 'producer' ? 'Producteur'
    : roleName === 'super_admin' || roleName === 'admin' ? 'Admin'
    : '';

  const vis = isAdmin
    ? (visibilityConfig[comment.visibility] ?? visibilityConfig.all)
    : null;

  const relDate = dayjs(comment.createdAt).fromNow();
  const absDate = dayjs(comment.createdAt).format('DD/MM/YYYY HH:mm');

  const handleDelete = async () => {
    dispatch(deleteComment(comment.documentId));
    const pegFilesToDelete: PegFile[] = await apiLoadPegFilesAndFiles(comment?.images);
    for (const pegFileToDelete of pegFilesToDelete) {
      apiDeleteFile(pegFileToDelete.id);
    }
    setConfirmDelete(false);
  };

  const isImage = (file: PegFile) => {
    const ext = (file.name || file.url || '').toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|svg)/.test(ext);
  };

  // Bubble colors
  const bubbleBg = isOwn
    ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
    : 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.04) 100%)';
  const bubbleBorder = isOwn
    ? '1px solid rgba(37,99,235,0.3)'
    : '1px solid rgba(255,255,255,0.08)';
  const textColor = isOwn ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isOwn ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: '8px',
        marginBottom: showAvatar ? '12px' : '3px',
        paddingLeft: isOwn ? '48px' : '0',
        paddingRight: isOwn ? '0' : '48px',
        animation: 'chatFadeIn 0.25s ease-out',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false); }}
    >
      {/* Avatar */}
      <div style={{ width: '32px', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        {showAvatar ? (
          <Avatar
            size={32}
            shape="circle"
            src={comment.user?.avatar?.url}
            icon={<HiUserCircle />}
            style={{
              border: `2px solid ${isOwn ? 'rgba(37,99,235,0.4)' : 'rgba(255,255,255,0.1)'}`,
            }}
          />
        ) : (
          <div style={{ width: '32px' }} />
        )}
      </div>

      {/* Bubble */}
      <div style={{ maxWidth: '70%', minWidth: '120px' }}>
        {/* Author name */}
        {showName && !isOwn && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '4px',
            paddingLeft: '4px',
          }}>
            <span style={{
              color: isOwn ? '#93bbfc' : 'rgba(255,255,255,0.6)',
              fontSize: '11px',
              fontWeight: 600,
            }}>
              {authorName}
            </span>
            {roleLabel && (
              <span style={{
                fontSize: '9px',
                fontWeight: 700,
                color: roleName === 'customer' ? '#fbbf24' : roleName === 'producer' ? '#a78bfa' : '#6b9eff',
                background: roleName === 'customer' ? 'rgba(234,179,8,0.1)' : roleName === 'producer' ? 'rgba(139,92,246,0.1)' : 'rgba(47,111,237,0.1)',
                padding: '1px 6px',
                borderRadius: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {roleLabel}
              </span>
            )}
          </div>
        )}

        {/* Main bubble */}
        <div style={{
          background: bubbleBg,
          border: bubbleBorder,
          borderRadius: isOwn
            ? (showAvatar ? '16px 16px 4px 16px' : '16px 4px 4px 16px')
            : (showAvatar ? '16px 16px 16px 4px' : '4px 16px 16px 4px'),
          padding: '10px 14px',
          position: 'relative',
          transition: 'transform 0.1s ease',
          transform: hovered ? 'scale(1.005)' : 'scale(1)',
        }}>
          {/* Content */}
          <div style={{
            color: textColor,
            fontSize: '13px',
            lineHeight: 1.6,
            wordBreak: 'break-word',
          }}>
            {safeHtmlParse(comment.content)}
          </div>

          {/* Images */}
          {comment.images?.length > 0 && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              marginTop: comment.content?.trim() ? '8px' : '0',
            }}>
              {comment.images.map((file: PegFile) => (
                <a
                  key={file.url || file.documentId}
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'block', textDecoration: 'none' }}
                >
                  {isImage(file) ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      style={{
                        maxHeight: '180px',
                        maxWidth: '240px',
                        objectFit: 'cover',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer',
                        transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                    />
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}>
                      <HiDownload size={14} style={{ color: '#6b9eff', flexShrink: 0 }} />
                      <span style={{
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '11px',
                        fontWeight: 500,
                        maxWidth: '160px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {file.name}
                      </span>
                    </div>
                  )}
                </a>
              ))}
            </div>
          )}

          {/* Footer: time + visibility */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isOwn ? 'flex-end' : 'flex-start',
            gap: '6px',
            marginTop: '6px',
          }}>
            <Tooltip title={absDate}>
              <span style={{
                color: isOwn ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.3)',
                fontSize: '10px',
                cursor: 'default',
              }}>
                {relDate}
              </span>
            </Tooltip>
            {vis && (
              <span style={{
                fontSize: '9px',
                fontWeight: 600,
                color: vis.color,
                background: vis.bg,
                border: `1px solid ${vis.border}`,
                borderRadius: '100px',
                padding: '1px 7px',
              }}>
                {vis.icon} {vis.label}
              </span>
            )}
          </div>
        </div>

        {/* Delete action */}
        {canDelete && hovered && (
          <div style={{
            display: 'flex',
            justifyContent: isOwn ? 'flex-end' : 'flex-start',
            marginTop: '4px',
            paddingLeft: isOwn ? '0' : '4px',
            paddingRight: isOwn ? '4px' : '0',
            animation: 'chatFadeIn 0.15s ease-out',
          }}>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.15)',
                  borderRadius: '8px',
                  padding: '3px 8px',
                  color: '#f87171',
                  fontSize: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'background 0.15s',
                }}
              >
                <HiTrash size={10} /> Supprimer
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HiExclamation size={12} style={{ color: '#f87171' }} />
                <button
                  onClick={handleDelete}
                  style={{
                    background: 'linear-gradient(90deg, #dc2626, #b91c1c)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  Confirmer
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  Non
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
