import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import AdaptableCard from '@/components/shared/AdaptableCard';
import Container from '@/components/shared/Container';
import { HiTrash } from 'react-icons/hi';
import { Project } from '@/@types/project';
import DetailsRight from './DetailsRight';
import { useAppDispatch } from '@/store';
import { setAddFile, setDeleteFile } from '../store';
import FileUplaodDragCustom from '@/components/shared/Upload/drag';
import { FaFilePdf } from 'react-icons/fa';
import { API_URL_IMAGE } from '@/configs/api.config';
import {
  deleteFileFromProject,
  uploadNewFileToProject,
} from '@/utils/hooks/projects/useFile';

const Files = ({ project }: { project: Project }) => {
  const [image, setImage] = useState<string>('');
  const [fileType, setFileType] = useState('');
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (image) {
      handleUpload();
    }
  }, [image]);
  const handleUpload = async () => {
    const data = {
      file: image,
      fileType: fileType,
      projectId: project.documentId,
    };
    const resp = await uploadNewFileToProject(data);
    if (resp.status === 'success' && resp.data) {
      setImage('');
      setFileType('');
      dispatch(
        setAddFile({
          _id: resp.data._id,
          file: resp.data.file,
          fileType: resp.data.fileType,
          createdAt: resp.data.createdAt,
        })
      );
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    const data = {
      fileId: fileId,
      projectId: project.documentId,
    };
    const resp = await deleteFileFromProject(data);
    if (resp.status === 'success') {
      dispatch(setDeleteFile(fileId));
    }
  };

  return (
    <Container className="h-full">
      <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <AdaptableCard rightSideBorder bodyClass="p-5">
            <FileUplaodDragCustom
              image={image}
              setImage={setImage}
              setFileType={setFileType}
            />
            <div className="flex flex-wrap gap-11 w-full mt-4">
              {project.files.map((file) => {
                const fileType = file.fileType.split('/')[0];
                return (
                  <div key={file._id} className=" col-span-1">
                    <a
                      href={API_URL_IMAGE + file.file}
                      target="_blank"
                      className="bg-gray-900 rounded-md w-40 h-40 cursor-pointer justify-center items-center flex flex-col"
                    >
                      {fileType === 'image' ? (
                        <img
                          src={API_URL_IMAGE + file.file}
                          alt="file"
                          className=" object-cover rounded-md"
                        />
                      ) : (
                        <FaFilePdf size={100} className="text-red-500" />
                      )}
                    </a>
                    <Button
                      className="flex justify-center items-center mt-2 gap-2"
                      onClick={() => handleDeleteFile(file._id)}
                    >
                      <HiTrash size={15} className="text-gray-500" />
                      <p className="text-sm text-gray-500">Supprimer</p>
                    </Button>
                  </div>
                );
              })}
            </div>
          </AdaptableCard>
        </div>
        <DetailsRight />
      </div>
    </Container>
  );
};

export default Files;
