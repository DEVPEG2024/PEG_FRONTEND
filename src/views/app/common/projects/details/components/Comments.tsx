import { useEffect, useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Timeline from '@/components/ui/Timeline';
import Container from '@/components/shared/Container';
import { HiUserCircle, HiOutlineSearch } from 'react-icons/hi';
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
import { Upload } from '@/components/ui';
import { ADMIN, SUPER_ADMIN } from '@/constants/roles.constant';
import { hasRole } from '@/utils/permissions';
import { Loading, RichTextEditor } from '@/components/shared';
import TimelineComment from './TimelineComment';

const VISIBILITY_OPTIONS = [
  { value: 'all',      label: 'Visible par tous',      color: '#6b9eff', bg: 'rgba(47,111,237,0.12)',  border: 'rgba(47,111,237,0.3)'  },
  { value: 'customer', label: 'Client uniquement',     color: '#fbbf24', bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.3)'   },
  { value: 'producer', label: 'Producteur uniquement', color: '#a78bfa', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)'  },
];

const Comments = () => {
  const [commentText, setCommentText] = useState<string>('');
  const [visibility, setVisibility] = useState<string>('all');
  const [pegFiles, setPegFiles] = useState<PegFile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const dispatch = useAppDispatch();
  const { user }: { user: User } = useRootAppSelector(
    (state: RootState) => state.auth.user
  );
  const { project, comments, loading } = useAppSelector(
    (state) => state.projectDetails.data
  );
  const avatarUrl = user?.avatar?.url;

  const isAdmin = hasRole(user, [SUPER_ADMIN, ADMIN]);

  const onEdit = (val: string) => {
    setCommentText(val);
  };

  const submitComment = async () => {
    if (commentText.trim() || pegFiles.length > 0) {
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

      // Client et producteur envoient automatiquement à leur rôle (visible par admins uniquement)
      // Seuls les admins peuvent choisir le destinataire
      const commentVisibility =
        user.role.name === 'customer'
          ? 'customer'
          : user.role.name === 'producer'
            ? 'producer'
            : visibility;

      const comment: Omit<Comment, 'documentId'> = {
        content: commentText,
        user: user,
        images: newPegFiles.map(({ id }) => id),
        visibility: commentVisibility,
      };

      dispatch(createComment({ comment, project }));
      setCommentText('');
      setPegFiles([]);
    }
  };

  const onFileAdd = async (file: File) => {
    setPegFiles([...pegFiles, { file, name: file.name }]);
  };

  const onFileRemove = (fileName: string) => {
    const pegFileToDelete: PegFile | undefined = pegFiles.find(
      ({ name }) => name === fileName
    );
    if (pegFileToDelete) {
      setPegFiles(pegFiles.filter(({ name }) => name !== fileName));
    }
  };

  const beforeUpload = (files: FileList | null) => {
    let valid: string | boolean = true;
    const allowedFileType = [
      'image/jpeg', 'image/png', 'image/jpg', 'image/webp',
      'application/pdf', 'application/x-pdf',
      'application/zip', 'application/x-zip-compressed',
      'image/vnd.adobe.photoshop', 'application/postscript', 'application/illustrator',
    ];
    if (files) {
      for (const file of files) {
        if (!allowedFileType.includes(file.type)) {
          valid = "Le format du fichier n'est pas pris en compte !";
        }
      }
    }
    return valid;
  };

  const determineVisibleComments = (comments: Comment[], user: User): Comment[] => {
    if (hasRole(user, [SUPER_ADMIN, ADMIN])) {
      return comments;
    }
    return comments.filter(
      ({ visibility }) => visibility === 'all' || visibility === user.role.name
    );
  };

  const activeVis = VISIBILITY_OPTIONS.find(o => o.value === visibility) ?? VISIBILITY_OPTIONS[0];

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

  return (
    <Container className="h-full">
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', paddingTop: '28px', paddingBottom: '28px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{
          background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
          borderRadius: '18px',
          padding: '24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
        }}>

          {/* Search bar */}
          {visibleComments.length > 3 && (
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <HiOutlineSearch size={14} style={{
                position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.25)', pointerEvents: 'none',
              }} />
              <input
                type="text"
                placeholder="Rechercher dans les commentaires…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px',
                  padding: '8px 12px 8px 34px', color: '#fff', fontSize: '12px',
                  fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.4)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              />
            </div>
          )}

          <Timeline>
            {filteredComments.map(
              (comment: Comment) => (
                <TimelineComment
                  key={comment.documentId}
                  comment={comment}
                  user={user}
                  isLast={comment.documentId === comments[comments.length - 1]?.documentId}
                />
              )
            )}
          </Timeline>

          {/* New comment input */}
          <div style={{
            marginTop: '20px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            padding: '16px',
          }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
              <div>
                <Avatar size={32} shape="circle" src={avatarUrl} icon={<HiUserCircle />} />
              </div>
              <div style={{ flex: 1 }}>
                <RichTextEditor onChange={onEdit} value={commentText} />
              </div>
            </div>

            {/* Visibility picker — admins only */}
            {isAdmin && (
              <div style={{ marginBottom: '14px' }}>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Destinataire
                </p>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {VISIBILITY_OPTIONS.map((opt) => {
                    const isActive = visibility === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setVisibility(opt.value)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '100px',
                          border: `1px solid ${isActive ? opt.border : 'rgba(255,255,255,0.1)'}`,
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600,
                          fontFamily: 'Inter, sans-serif',
                          background: isActive ? opt.bg : 'rgba(255,255,255,0.04)',
                          color: isActive ? opt.color : 'rgba(255,255,255,0.6)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <Upload
                multiple
                showList
                draggable
                uploadLimit={4}
                beforeUpload={beforeUpload}
                onFileAdd={(file) => onFileAdd(file)}
                onFileRemove={(file) => onFileRemove(file)}
                field={{ name: 'images' }}
                fileList={pegFiles.map(({ file }) => file)}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isAdmin && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    background: activeVis.bg, border: `1px solid ${activeVis.border}`,
                    borderRadius: '100px', padding: '4px 10px',
                    color: activeVis.color, fontSize: '11px', fontWeight: 600,
                  }}>
                    {activeVis.label}
                  </span>
                )}
                <Button variant="solid" onClick={submitComment} loading={loading}>
                  Envoyer
                </Button>
              </div>
            </div>
          </div>
        </div>
        <DetailsRight />
      </div>
    </Container>
  );
};

export default Comments;
