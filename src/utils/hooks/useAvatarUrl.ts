import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '@/store';
import { setAvatarUrl } from '../../store/slices/base/avatarUrlSlice';
import { PegFile } from '@/@types/pegFile';
import { apiLoadPegFilesAndFiles } from '@/services/FileServices';

const useAvatarUrl = (avatar?: PegFile) : {avatarUrl?: string, fetchAvatarUrl: () => Promise<string | undefined>} => {
  const dispatch = useDispatch();
  const avatarUrl = useSelector((state: RootState) => avatar ? state.base.avatarUrl[avatar.documentId] : undefined);

  const fetchAvatarUrl = async () => {
    if (!avatar) return undefined;
    if (avatarUrl) return avatarUrl;

    const imageLoaded: PegFile = (await apiLoadPegFilesAndFiles([avatar]))[0];
    dispatch(setAvatarUrl({ documentId: avatar.documentId, url: imageLoaded.url }));
    return imageLoaded.url;
  };

  return { avatarUrl, fetchAvatarUrl };
};

export default useAvatarUrl;