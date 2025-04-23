import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import AdaptableCard from '@/components/shared/AdaptableCard';
import Container from '@/components/shared/Container';
import DetailsRight from './DetailsRight';
import { PegFile } from '@/@types/pegFile';
import { Upload } from '@/components/ui';
import { useAppDispatch } from '@/store';
import { setLoading, updateCurrentProject, useAppSelector } from '../store';
import { apiDeleteFile, apiLoadPegFilesAndFiles, apiUploadFile } from '@/services/FileServices';
import { Loading } from '@/components/shared';

const Files = () => {
  const [pegFiles, setPegFiles] = useState<PegFile[]>([]);
  const [pegFilesIdToDelete, setPegFilesIdToDelete] = useState<string[]>([]);
  const [pegFilesChanged, setPegFilesChanged] = useState<boolean>(false);
  const dispatch = useAppDispatch();
  const { project, loading } = useAppSelector(
    (state) => state.projectDetails.data
  );

  useEffect(() => {
    fetchFiles();
  }, [project]);

  const fetchFiles = async (): Promise<void> => {
    if (project?.images?.length > 0) {
      const pegFilesLoaded: PegFile[] = await apiLoadPegFilesAndFiles(
        project?.images
      );

      setPegFiles(pegFilesLoaded);
    }
  };

  const onFileAdd = async (file: File) => {
    setPegFiles([...pegFiles, { file, name: file.name }]);
    setPegFilesChanged(true);
  };

  const onFileRemove = (fileName: string) => {
    const pegFileToDelete: PegFile | undefined = pegFiles.find(
      ({ name }) => name === fileName
    );

    if (pegFileToDelete) {
      setPegFilesIdToDelete([...pegFilesIdToDelete, pegFileToDelete.id]);
      setPegFiles(pegFiles.filter(({ name }) => name !== fileName));
      setPegFilesChanged(true);
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

  const handleSubmit = async () => {
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

    for (const pegFileIdToDelete of pegFilesIdToDelete) {
      apiDeleteFile(pegFileIdToDelete)
    }

    dispatch(
      updateCurrentProject({
        documentId: project.documentId,
        images: newPegFiles.map(({ id }) => id),
      })
    );
    setPegFiles([]);
    setPegFilesChanged(false);
  };

  return (
    <Container className="h-full">
      <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Loading loading={loading}>
            <AdaptableCard rightSideBorder bodyClass="p-5">
              <Upload
                multiple
                showList
                draggable
                beforeUpload={beforeUpload}
                onFileAdd={(file) => onFileAdd(file)}
                onFileRemove={(file) => onFileRemove(file)}
                field={{ name: 'images' }}
                fileList={pegFiles.map((pegFile) => {
                  const file = pegFile.file;

                  file.previewUrl = pegFile.url;
                  return file;
                })}
                clickable
              />
              {pegFilesChanged && (
                <Button
                  variant="solid"
                  onClick={handleSubmit}
                  loading={loading}
                >
                  Enregistrer
                </Button>
              )}
            </AdaptableCard>
          </Loading>
        </div>
        <DetailsRight />
      </div>
    </Container>
  );
};

export default Files;
