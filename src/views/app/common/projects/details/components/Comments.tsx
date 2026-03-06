import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Timeline from '@/components/ui/Timeline';
import Card from '@/components/ui/Card';
import { debounce } from 'lodash';
import Container from '@/components/shared/Container';
import { HiUserCircle } from 'react-icons/hi';
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
import { Select, Upload } from '@/components/ui';
import { ADMIN, SUPER_ADMIN } from '@/constants/roles.constant';
import { visibilityData } from '../../lists/constants';
import { hasRole } from '@/utils/permissions';
import { Loading, RichTextEditor } from '@/components/shared';
import TimelineComment from './TimelineComment';
import useAvatarUrl from '@/utils/hooks/useAvatarUrl';

const Comments = () => {
  const [commentText, setCommentText] = useState<string>('');
  const [visibility, setVisibility] = useState<string>('all');
  const [pegFiles, setPegFiles] = useState<PegFile[]>([]);
  const dispatch = useAppDispatch();
  const { user }: { user: User } = useRootAppSelector(
    (state: RootState) => state.auth.user
  );
  const { project, comments, loading } = useAppSelector(
    (state) => state.projectDetails.data
  );
  const { avatarUrl, fetchAvatarUrl } = useAvatarUrl(user?.avatar);
  const [avatarLoading, setAvatarLoading] = useState<boolean>(false);

  useEffect(() => {
    setAvatarLoading(true);
    if (!avatarUrl) {
      fetchAvatarUrl();
    }
    setAvatarLoading(false);
  }, [avatarUrl]);

  const onEdit = (val: string) => {
    debounceFn(val);
  };

  const debounceFn = debounce(handleDebounceFn, 1000);

  function handleDebounceFn(val: string) {
    setCommentText(val);
  }

  const submitComment = async () => {
    if (commentText.trim()) {
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

      const comment: Omit<Comment, 'documentId'> = {
        content: commentText,
        user: user,
        images: newPegFiles.map(({ id }) => id),
        visibility:
          user.role.name === 'customer'
            ? 'customer'
            : user.role.name === 'producer'
              ? 'producer'
              : visibility,
      };

      dispatch(createComment({ comment, project }));
      setCommentText('');
      setPegFiles([]);
    }
  };

  // TODO: Voir pour mettre en commun dans un composant Upload dédié --> EditProduct utilise également + Files.tsx
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
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
      'application/pdf',
      'application/x-pdf',
      'application/pdf',
      'application/x-pdf',
      'application/pdf',
      'application/x-pdf',
      'application/pdf',
      'application/x-pdf',
      'application/pdf',
      'application/x-pdf',
      'application/zip',
      'application/x-zip-compressed',
      'image/vnd.adobe.photoshop',
      'application/postscript',
      'application/illustrator',
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

  const determineVisibleComments = (
    comments: Comment[],
    user: User
  ): Comment[] => {
    if (hasRole(user, [SUPER_ADMIN, ADMIN])) {
      return comments;
    } else {
      return comments.filter(
        ({ visibility }) =>
          visibility === 'all' || visibility === user.role.name
      );
    }
  };

  return (
    <Container className="h-full">
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', paddingTop: '28px', paddingBottom: '28px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{
          background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
          borderRadius: '18px',
          padding: '24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
        }}>
          <Timeline>
            {determineVisibleComments(comments, user).map(
              (comment: Comment) => (
                <TimelineComment
                  key={comment.documentId}
                  comment={comment}
                  user={user}
                  isLast={
                    comment.documentId ===
                    comments[comments.length - 1].documentId
                  }
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
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <Loading loading={avatarLoading}>
                <Avatar
                  size={32}
                  shape="circle"
                  src={avatarUrl}
                  icon={<HiUserCircle />}
                />
              </Loading>
              <div style={{ flex: 1 }}>
                <RichTextEditor onChange={onEdit} value={commentText} />
              </div>
            </div>
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
              {hasRole(user, [SUPER_ADMIN, ADMIN]) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', whiteSpace: 'nowrap' }}>Visibilité :</span>
                  <Select
                    size="sm"
                    placeholder="Visibilité"
                    options={visibilityData}
                    value={visibilityData.find(({ value }) => value === visibility)}
                    onChange={(e: any) => setVisibility(e.value)}
                  />
                </div>
              )}
              <Button
                variant="solid"
                onClick={submitComment}
                loading={loading}
              >
                Ajouter
              </Button>
            </div>
          </div>
        </div>
        <DetailsRight />
      </div>
    </Container>
  );
};

export default Comments;
