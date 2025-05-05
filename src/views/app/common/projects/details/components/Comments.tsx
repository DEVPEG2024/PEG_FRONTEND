import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Timeline from '@/components/ui/Timeline';
import Card from '@/components/ui/Card';
import { debounce } from 'lodash';
import AdaptableCard from '@/components/shared/AdaptableCard';
import Container from '@/components/shared/Container';
import { HiUserCircle } from 'react-icons/hi';
import { Comment } from '@/@types/project';
import DetailsRight from './DetailsRight';
import {
  RootState,
  useAppDispatch,
  useAppSelector as useRootAppSelector,
} from '@/store';
import {
  createComment,
  setLoading,
  useAppSelector,
} from '../store';
import { User } from '@/@types/user';
import { PegFile } from '@/@types/pegFile';
import { apiLoadPegFilesAndFiles, apiUploadFile } from '@/services/FileServices';
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
  const {avatarUrl, fetchAvatarUrl} = useAvatarUrl(user?.avatar)
  const [avatarLoading, setAvatarLoading] = useState<boolean>(false);
  
  useEffect(() => {
      setAvatarLoading(true)
      if (!avatarUrl) {
          fetchAvatarUrl();
      }
      setAvatarLoading(false)
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
      'application/illustrator'
    ];
    if (files) {
      for (const file of files) {
        if (!allowedFileType.includes(file.type)) {
          valid = 'Le format du fichier n\'est pas pris en compte !';
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
      <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <AdaptableCard rightSideBorder bodyClass="p-5">
            <div>
              <h4>Commentaires</h4>
              <Timeline>
                {determineVisibleComments(comments, user).map((comment: Comment) => (
                  <TimelineComment
                    key={comment.documentId}
                    comment={comment}
                    user={user}
                    isLast={
                      comment.documentId ===
                      comments[comments.length - 1].documentId
                    }
                  />
                ))}
              </Timeline>
              <Card className="mt-6">
                <div className="mt-1 mb-3 flex flex-auto gap-4">
                  <Loading loading={avatarLoading}>
                    <Avatar size={30} shape="circle" src={avatarUrl} icon={<HiUserCircle />} />
                  </Loading>
                  <div className="w-full">
                    <RichTextEditor
                      onChange={onEdit}
                      value={commentText}
                      placeholder="Ajouter un commentaire"
                    />
                  </div>
                </div>
                <div className="flex flex-row items-center justify-between gap-2 mb-4">
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
                    <div className="flex flex-row self-start w-1/2 items-center gap-4">
                      <span className="w-max">Visibilité :</span>
                      <Select
                        size="sm"
                        className="w-3/4 justify-self-start"
                        placeholder={'Visibilité'}
                        options={visibilityData}
                        value={visibilityData.find(
                          ({ value }) => value === visibility
                        )}
                        onChange={(e: any) => {
                          setVisibility(e.value);
                        }}
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
              </Card>
            </div>
          </AdaptableCard>
        </div>
        <DetailsRight />
      </div>
    </Container>
  );
};

export default Comments;
