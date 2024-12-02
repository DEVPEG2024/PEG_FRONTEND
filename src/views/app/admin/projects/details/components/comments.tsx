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
import { Project } from '@/@types/project';
import DetailsRight from './detailsRight';
import { IUser, User } from '@/@types/user';
import { RootState, useAppDispatch, useAppSelector } from '@/store';
import { setAddComment, setAddFile, setDeleteComment } from '../../store';
import dayjs from 'dayjs';
import FileUplaodCustom from '@/components/shared/Upload';
import {
  createComment,
  deleteComment,
} from '@/utils/hooks/projects/useComments';
import { FaFilePdf, FaFileAlt } from 'react-icons/fa';
import { API_URL_IMAGE } from '@/configs/api.config';

// Nouveau type pour les commentaires
export interface IComment {
  _id: string;
  comment: string;
  user: IUser;
  createdAt: Date;
  file: string;
  fileType: string;
}

type TimelineCommentProps = TimeLineItemProps & {
  comment: IComment;
  projectId: string;
};

const Comments = ({ project }: { project: Project }) => {
  const [commentText, setCommentText] = useState('');
  const [image, setImage] = useState<string>('');
  const [fileType, setFileType] = useState('');
  const dispatch = useAppDispatch();
  const {user}: {user: User} = useAppSelector((state: RootState) => state.auth.user);
  const submitComment = async () => {
    if (commentText.trim()) {
      const comment = {
        comment: commentText,
        user: user?.documentId,
        createdAt: dayjs().toISOString(),
        file: image,
        fileType: fileType,
        projectId: project.documentId,
      };

      const resp = await createComment(comment);
      if (resp.status === 'success' && resp.data) {
        setCommentText(''); // Réinitialiser le texte du commentaire
        setImage('');
        setFileType('');
        dispatch(
          setAddComment({
            _id: resp.data._id,
            comment: resp.data.comment,
            user: user,
            createdAt: resp.data.createdAt,
            file: resp.data.file,
            fileType: resp.data.fileType,
          })
        );
        dispatch(
          setAddFile({
            _id: resp.file._id,
            file: resp.file.file,
            fileType: resp.file.fileType,
            createdAt: resp.file.createdAt,
          })
        );
      }
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
                {project.comments.map((comment) => (
                  <TimelineComment
                    key={comment.documentId}
                    projectId={project.documentId}
                    comment={comment as unknown as IComment}
                    isLast={
                      comment.documentId ===
                      project.comments[project.comments.length - 1].documentId
                    }
                  />
                ))}
              </Timeline>
              <div className="mt-6 mb-3 flex flex-auto">
                <Avatar size={30} shape="circle" icon={<HiUserCircle />} />
                <div className="ml-4 rtl:mr-4 w-full">
                  <Input
                    onChange={(e) => setCommentText(e.target.value)}
                    value={commentText}
                    textArea
                    placeholder="Ajouter un commentaire"
                  />
                </div>
              </div>
              <div className="flex flex-row items-center justify-end gap-2">
                <FileUplaodCustom
                  image={image}
                  setImage={setImage}
                  setFileType={setFileType}
                />
                <Button variant="solid" onClick={submitComment}>
                  Ajouter
                </Button>
              </div>
            </div>
          </AdaptableCard>
        </div>
        <DetailsRight project={project} />
      </div>
    </Container>
  );
};

const TimelineComment = ({
  comment,
  projectId,
  ...rest
}: TimelineCommentProps) => {
  const userName =
    typeof comment.user === 'string'
      ? comment.user
      : `${comment.user.firstName} ${comment.user.lastName}`;
  const dispatch = useAppDispatch();
  const handleDeleteComment = async () => {
    const resp = await deleteComment({
      _id: comment._id,
      projectId: projectId,
    });
    if (resp.status === 'success') {
      dispatch(setDeleteComment(comment._id));
    }
  };
  const renderFilePreview = () => {
    if (!comment.file) return null;

    const fileType = comment.fileType.split('/')[0];
    const fileExtension = comment.fileType.split('/')[1];

    switch (fileType) {
      case 'image':
        return (
          <a
            href={API_URL_IMAGE + comment.file}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center"
          >
            <div className=" bg-gray-900 rounded-md">
              <img
                src={API_URL_IMAGE + comment.file}
                alt="comment"
                className="w-20 h-20 object-cover rounded-md"
              />
            </div>
            <p className="text-gray-500"> Télécharger</p>
          </a>
        );
      case 'application':
        if (fileExtension === 'pdf') {
          return (
            <div className="flex flex-col items-center justify-center">
              <div className=" bg-gray-900 rounded-md">
                <a
                  href={API_URL_IMAGE + comment.file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-20 h-12 flex items-center justify-center"
                >
                  <FaFilePdf size={30} className="text-red-500" />
                </a>
              </div>
              <p className="text-gray-500"> Télécharger</p>
            </div>
          );
        }
        return (
          <div className="flex flex-col items-center justify-center">
            <div className=" bg-gray-900 rounded-md">
              <a
                href={API_URL_IMAGE + comment.file}
                target="_blank"
                rel="noopener noreferrer"
                className="w-20 h-12 flex items-center justify-center"
              >
                <FaFileAlt size={30} className="text-gray-500" />
              </a>
            </div>
            <p className="text-gray-500"> Télécharger</p>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center">
            <div className=" bg-gray-900 rounded-md">
              <a
                href={API_URL_IMAGE + comment.file}
                target="_blank"
                rel="noopener noreferrer"
                className="w-20 h-12 flex items-center justify-center"
              >
                <FaFileAlt size={30} className="text-gray-500" />
              </a>
            </div>
            <p className="text-gray-500"> Télécharger</p>
          </div>
        );
    }
  };

  return (
    <Timeline.Item
      className="w-full mt-4"
      media={<Avatar size={30} shape="circle" icon={<HiUserCircle />} />}
      {...rest}
    >
      <div className="my-1 flex items-center justify-between">
        <span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {userName}
          </span>
          <span className="mx-2">a ajouté un commentaire </span>
          <span className="text-gray-500 text-end">
            le {dayjs(comment.createdAt).format('DD/MM/YYYY à HH:mm')}
          </span>
        </span>
      </div>
      <div className="grid grid-cols-12 gap-4 mt-4">
        <Card
          bordered
          className={`${comment.file ? 'col-span-11' : 'col-span-12'}`}
        >
          <p>{comment.comment}</p>
          <p
            className="text-gray-500 text-end cursor-pointer hover:text-red-500"
            onClick={handleDeleteComment}
          >
            Supprimer
          </p>
        </Card>
        {comment.file && (
          <div className="col-span-1 flex flex-col items-center justify-center">
            {renderFilePreview()}
          </div>
        )}
      </div>
    </Timeline.Item>
  );
};
export default Comments;
