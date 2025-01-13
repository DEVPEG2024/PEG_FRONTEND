import { useState } from 'react';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Timeline from '@/components/ui/Timeline';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import AdaptableCard from '@/components/shared/AdaptableCard';
import Container from '@/components/shared/Container';
import { HiUserCircle } from 'react-icons/hi';
import type { TimeLineItemProps } from '@/components/ui/Timeline';
import { Comment } from '@/@types/project';
import DetailsRight from './DetailsRight';
import { RootState, useAppDispatch, useAppSelector as useRootAppSelector } from '@/store';
import { createComment, deleteComment, setLoading, useAppSelector } from '../store';
import dayjs from 'dayjs';
import { User } from '@/@types/user';
import { Image } from '@/@types/image';
import { apiUploadFile } from '@/services/FileServices';
import { Select, Upload } from '@/components/ui';
import { ADMIN, SUPER_ADMIN } from '@/constants/roles.constant';
import { visibilityData } from '../../lists/constants';
import { hasRole } from '@/utils/permissions';

type TimelineCommentProps = TimeLineItemProps & {
  comment: Comment;
  user: User;
};

// TODO SUITE: Continuer et vérifier si ok en testant
const Comments = () => {
  const [commentText, setCommentText] = useState<string>('');
  const [visibility, setVisibility] = useState<string>('all');
  const [images, setImages] = useState<Image[]>([])
  const dispatch = useAppDispatch();
  const {user}: {user: User} = useRootAppSelector((state: RootState) => state.auth.user);
  const {project, comments, loading} = useAppSelector((state) => state.projectDetails.data);

  const submitComment = async () => {
    if (commentText.trim()) {
      const newImages: Image[] = []

      dispatch(setLoading(true))
      for (const image of images) {
        if (image.id) {
          newImages.push(image)
        } else {
          const imageUploaded: Image = await apiUploadFile(image.file)
          newImages.push(imageUploaded)
        }
      }

      const comment: Omit<Comment, 'documentId'> = {
        content: commentText,
        user: user,
        images: newImages.map(({id}) => id),
        visibility: user.role.name === 'customer' ? 'customer' : user.role.name === 'producer' ? 'producer' : visibility,
      };

      dispatch(createComment({comment, project}))
      setCommentText('')
      setImages([])
    }
  };

  // TODO: Voir pour mettre en commun dans un composant Upload dédié --> EditProduct utilise également + Files.tsx
  const onFileAdd = async (
    file: File
  ) => {
    setImages([...images, {file, name: file.name}]);
  };

  const onFileRemove = (
    fileName: string
  ) => {
    const imageToDelete: Image | undefined = images.find(({name}) => name === fileName)

    if (imageToDelete) {
      setImages(images.filter(({name}) => name !== fileName));
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
    ];
    if (files) {
      for (const file of files) {
        if (!allowedFileType.includes(file.type)) {
          valid = 'Veuillez télécharger un fichier .jpeg ou .png!';
        }
      }
    }

    return valid;
  };

  const determineVisibleComments = (comments: Comment[], user: User): Comment[] => {
    if (hasRole(user, [SUPER_ADMIN, ADMIN])) {
      return comments
    } else {
      return comments.filter(({visibility}) => visibility === 'all' || visibility === user.role.name)
    }
  }

  return (
    <Container className="h-full">
      <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <AdaptableCard rightSideBorder bodyClass="p-5">
            <div>
              <h4>Commentaires</h4>
              <Timeline>
                {determineVisibleComments(comments, user).map((comment) => (
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
                  <Avatar size={30} shape="circle" icon={<HiUserCircle />} />
                  <div className="w-full">
                    <Input
                      onChange={(e) => setCommentText(e.target.value)}
                      value={commentText}
                      textArea
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
                    onFileAdd={(file) =>
                      onFileAdd(file)
                    }
                    onFileRemove={(file) =>
                      onFileRemove(file)
                    }
                    field={{ name: 'images' }}
                    fileList={images.map(({file}) => file)}
                  />
                  {hasRole(user, [SUPER_ADMIN, ADMIN]) && (
                    <div className="flex flex-row self-start w-1/2 items-center gap-4">
                      <span className="w-max">Visibilité :</span>
                      <Select
                        size="sm"
                        className="w-3/4 justify-self-start"
                        placeholder={'Visibilité'}
                        options={visibilityData}
                        value={visibilityData.find(({value}) => value === visibility)}
                        onChange={(e: any) => {
                          setVisibility(e.value);
                        }}
                      />
                    </div>
                  )}
                  <Button variant="solid" onClick={submitComment} loading={loading}>
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

const TimelineComment = ({
  comment,
  user,
  ...rest
}: TimelineCommentProps) => {
  const determineAuthorRoleLabel = (user: User): string => {
    switch (user.role.name) {
      case 'customer':
        return 'Client ' + user.customer?.name;
      case 'producer':
        return 'Producteur ' + user.producer?.name;
      case 'super_admin':
        return 'Administrateur';
      default:
        return '';
    }
  }
  const authorLabel = `${comment.user.firstName} ${comment.user.lastName} (${determineAuthorRoleLabel(comment.user)})`;
  const dispatch = useAppDispatch();

  const handleDeleteComment = async () => {
    dispatch(deleteComment(comment.documentId))
  };

  const determineCommentVisibility = (visibility: string): string => {
    return visibilityData.find(({value}) => value === visibility)?.label || visibilityData.find(({value}) => value === 'all')!.label;
  }

  return (
    <Timeline.Item
      className="w-full mt-4"
      media={<Avatar size={30} shape="circle" icon={<HiUserCircle />} />}
      {...rest}
    >
      <div className="my-1 flex items-center justify-between">
        <span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {authorLabel}
          </span>
          <span className="mx-2">a ajouté un commentaire </span>
          <span className="text-gray-500 text-end">
            le {dayjs(comment.createdAt).format('DD/MM/YYYY à HH:mm')}
          </span>
        </span>
        {hasRole(user, [SUPER_ADMIN, ADMIN]) && (
          <span>{`Visibilité : ${determineCommentVisibility(comment.visibility)}`}</span>
        )}
      </div>
      <div className="grid grid-cols-12 gap-4 mt-4">
        <Card
          bordered
          className={`${comment.images.length > 0 ? 'col-span-11' : 'col-span-12'}`}
        >
          <p>{comment.content}</p>
          <p
            className="text-gray-500 text-end cursor-pointer hover:text-red-500"
            onClick={handleDeleteComment}
          >
            Supprimer
          </p>
        </Card>
        {comment.images.length > 0 && (
          <div className="col-span-1 flex flex-col items-center justify-center">
            {comment.images.map((image: Image) => (
              <div className=" bg-gray-900 rounded-md">
                <a href={image.url} target="_blank">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="rounded-lg bg-slate-50"
                    style={{
                      height: '250px',
                      width: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </Timeline.Item>
  );
};
export default Comments;
