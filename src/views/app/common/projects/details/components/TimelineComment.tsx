import { PegFile } from '@/@types/pegFile';
import { User } from '@/@types/user';
import {
  Avatar,
  TimeLineItemProps,
  Tooltip,
} from '@/components/ui';
import {
  apiDeleteFile,
  apiLoadPegFilesAndFiles,
} from '@/services/FileServices';
import { useAppDispatch } from '@/store';
import { useEffect, useState } from 'react';
import { deleteComment } from '../store';
import Timeline from '@/components/ui/Timeline';
import { Loading } from '@/components/shared';
import { HiUserCircle, HiTrash, HiExclamation } from 'react-icons/hi';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';
import ReactHtmlParser from 'html-react-parser';
import { Comment } from '@/@types/project';
import useAvatarUrl from '@/utils/hooks/useAvatarUrl';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN } from '@/constants/roles.constant';

dayjs.extend(relativeTime);
dayjs.locale('fr');

type TimelineCommentProps = TimeLineItemProps & {
  comment: Comment;
  user: User;
};

const visibilityStyle: Record<string, { label: string; color: string; bg: string; border: string }> = {
  all:      { label: 'Visible par tous',      color: '#6b9eff', bg: 'rgba(47,111,237,0.12)',  border: 'rgba(47,111,237,0.25)'  },
  customer: { label: 'Client uniquement',     color: '#fbbf24', bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.25)'   },
  producer: { label: 'Producteur uniquement', color: '#a78bfa', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.25)'  },
  admin:    { label: 'Admin uniquement',      color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  border: 'rgba(148,163,184,0.2)'  },
};

const TimelineComment = ({ comment, user, ...rest }: TimelineCommentProps) => {
  const { avatarUrl, fetchAvatarUrl } = useAvatarUrl(comment.user?.avatar);
  const [avatarLoading, setAvatarLoading] = useState<boolean>(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setAvatarLoading(true);
    if (!avatarUrl) {
      fetchAvatarUrl();
    }
    setAvatarLoading(false);
  }, [avatarUrl]);

  const determineAuthorRoleLabel = (u: User): string => {
    switch (u.role.name) {
      case 'customer':  return 'Client ' + (u.customer?.name ?? 'Inconnu');
      case 'producer':  return 'Producteur ' + (u.producer?.name ?? 'Inconnu');
      case 'super_admin': return 'Administrateur';
      default: return '';
    }
  };

  const authorLabel = comment.user
    ? `${comment.user.firstName} ${comment.user.lastName} (${determineAuthorRoleLabel(comment.user)})`
    : 'Utilisateur supprimé';

  const dispatch = useAppDispatch();

  const handleDeleteComment = async () => {
    dispatch(deleteComment(comment.documentId));
    const pegFilesToDelete: PegFile[] = await apiLoadPegFilesAndFiles(comment?.images);
    for (const pegFileToDelete of pegFilesToDelete) {
      apiDeleteFile(pegFileToDelete.id);
    }
    setConfirmDelete(false);
  };

  const isAdmin = hasRole(user, [ADMIN, SUPER_ADMIN]);
  const vis = isAdmin
    ? (visibilityStyle[comment.visibility] ?? visibilityStyle.all)
    : { label: 'PEG', color: '#6b9eff', bg: 'rgba(47,111,237,0.12)', border: 'rgba(47,111,237,0.25)' };

  // Relative + absolute date
  const relDate = dayjs(comment.createdAt).fromNow();
  const absDate = dayjs(comment.createdAt).format('DD/MM/YYYY à HH:mm');

  return (
    <Timeline.Item
      className="w-full mt-4"
      media={
        <Loading loading={avatarLoading}>
          <Avatar
            size={30}
            shape="circle"
            src={avatarUrl}
            icon={<HiUserCircle />}
          />
        </Loading>
      }
      {...rest}
    >
      <div style={{ fontFamily: 'Inter, sans-serif' }}>
        {/* Header: author + date + visibility */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600, fontSize: '13px' }}>
              {authorLabel}
            </span>
            <Tooltip title={absDate}>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', cursor: 'default' }}>
                · {relDate}
              </span>
            </Tooltip>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            background: vis.bg, border: `1px solid ${vis.border}`,
            borderRadius: '100px', padding: '3px 10px',
            color: vis.color, fontSize: '11px', fontWeight: 600,
            flexShrink: 0,
          }}>
            {vis.label}
          </span>
        </div>

        {/* Comment body */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '14px 16px',
          display: 'grid',
          gridTemplateColumns: comment.images.length > 0 ? '1fr auto' : '1fr',
          gap: '12px',
          alignItems: 'start',
        }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', lineHeight: 1.7 }}>
              {ReactHtmlParser(comment.content)}
            </div>
            <div style={{ marginTop: '10px' }}>
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)',
                    borderRadius: '7px', padding: '4px 10px',
                    color: '#f87171', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <HiTrash size={12} /> Supprimer
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HiExclamation size={14} style={{ color: '#f87171', flexShrink: 0 }} />
                  <span style={{ color: '#f87171', fontSize: '11px', fontWeight: 600 }}>Confirmer ?</span>
                  <button
                    onClick={handleDeleteComment}
                    style={{
                      background: 'linear-gradient(90deg, #dc2626, #b91c1c)',
                      border: 'none', borderRadius: '6px', padding: '4px 12px',
                      color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    Oui, supprimer
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    style={{
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '6px', padding: '4px 12px',
                      color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>
          </div>

          {comment.images.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {comment.images.map((image: PegFile) => (
                <a key={image.url} href={image.url} target="_blank" rel="noreferrer">
                  <img
                    src={image.url}
                    alt={image.name}
                    style={{
                      height: '120px',
                      width: '120px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </Timeline.Item>
  );
};

export default TimelineComment;
