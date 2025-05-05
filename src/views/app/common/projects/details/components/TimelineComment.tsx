import { PegFile } from "@/@types/pegFile";
import { User } from "@/@types/user";
import { Avatar, Card, TimeLineItemProps } from "@/components/ui";
import { apiDeleteFile, apiLoadPegFilesAndFiles } from "@/services/FileServices";
import { useAppDispatch } from "@/store";
import { useEffect, useState } from "react";
import { deleteComment } from "../store";
import Timeline from '@/components/ui/Timeline';
import { Loading } from "@/components/shared";
import { HiUserCircle } from "react-icons/hi";
import dayjs from "dayjs";
import { hasRole } from "@/utils/permissions";
import { ADMIN, SUPER_ADMIN } from "@/constants/roles.constant";
import ReactHtmlParser from 'html-react-parser';
import { Comment } from '@/@types/project';
import { visibilityData } from '../../lists/constants';
import useAvatarUrl from "@/utils/hooks/useAvatarUrl";

type TimelineCommentProps = TimeLineItemProps & {
  comment: Comment;
  user: User;
};

const TimelineComment = ({ comment, user, ...rest }: TimelineCommentProps) => {
    const {avatarUrl, fetchAvatarUrl} = useAvatarUrl(comment.user?.avatar)
    const [avatarLoading, setAvatarLoading] = useState<boolean>(false);

    useEffect(() => {
        setAvatarLoading(true)
        if (!avatarUrl) {
            fetchAvatarUrl();
        }
        setAvatarLoading(false)
    }, [avatarUrl]);
  
    const determineAuthorRoleLabel = (user: User): string => {
      switch (user.role.name) {
        case 'customer':
          return 'Client ' + (user.customer?.name ?? 'Inconnu');
        case 'producer':
          return 'Producteur ' + (user.producer?.name ?? 'Inconnu');
        case 'super_admin':
          return 'Administrateur';
        default:
          return '';
      }
    };
    const authorLabel = comment.user ? `${comment.user.firstName} ${comment.user.lastName} (${determineAuthorRoleLabel(comment.user)})` : 'Utilisateur supprimé';
    const dispatch = useAppDispatch();
  
    const handleDeleteComment = async () => {
      dispatch(deleteComment(comment.documentId));
      const pegFilesToDelete: PegFile[] = await apiLoadPegFilesAndFiles(comment?.images);
  
      for (const pegFileToDelete of pegFilesToDelete) {
        apiDeleteFile(pegFileToDelete.id)
      }
    };
  
    const determineCommentVisibility = (visibility: string): string => {
      return (
        visibilityData.find(({ value }) => value === visibility)?.label ||
        visibilityData.find(({ value }) => value === 'all')!.label
      );
    };
  
    return (
      <Timeline.Item
        className="w-full mt-4"
        media={
          <Loading loading={avatarLoading}>
            <Avatar size={30} shape="circle" src={avatarUrl} icon={<HiUserCircle />} />
          </Loading>}
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
            <p className="prose dark:prose-invert max-w-none text-sm">
              {ReactHtmlParser(comment.content)}
            </p>
            <p
              className="text-gray-500 text-end cursor-pointer hover:text-red-500"
              onClick={handleDeleteComment}
            >
              Supprimer
            </p>
          </Card>
          {comment.images.length > 0 && (
            <div className="col-span-1 flex flex-col items-center justify-center">
              {comment.images.map((image: PegFile) => (
                <div className=" bg-gray-900 rounded-md">
                  <a href={image.url} target="_blank" rel="noreferrer">
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

export default TimelineComment;