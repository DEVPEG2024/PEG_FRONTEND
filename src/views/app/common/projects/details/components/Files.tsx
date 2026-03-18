import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Container from '@/components/shared/Container';
import DetailsRight from './DetailsRight';
import { PegFile } from '@/@types/pegFile';
import { Upload } from '@/components/ui';
import { useAppDispatch } from '@/store';
import { updateCurrentProject, useAppSelector } from '../store';
import {
  apiDeleteFile,
  apiGetPegFiles,
  apiUploadFile,
} from '@/services/FileServices';
import { Loading } from '@/components/shared';

const Files = () => {
  const [pegFiles, setPegFiles] = useState<PegFile[]>([]);
  const [pegFilesIdToDelete, setPegFilesIdToDelete] = useState<string[]>([]);
  const [pegFilesChanged, setPegFilesChanged] = useState<boolean>(false);
  const [filesLoading, setFilesLoading] = useState<boolean>(false);
  const dispatch = useAppDispatch();
  const { project } = useAppSelector(
    (state) => state.projectDetails.data
  );

  useEffect(() => {
    fetchFiles();
  }, [project]);

  const fetchFiles = async (): Promise<void> => {
    setFilesLoading(true);
    if (project?.images?.length > 0) {
      const pegFilesLoaded: PegFile[] = await apiGetPegFiles(project.images);
      const pegFilesWithFile = pegFilesLoaded.map((pegFile) => ({
        ...pegFile,
        file: new File([], pegFile.name),
      }));
      setPegFiles(pegFilesWithFile);
    }
    setFilesLoading(false);
  };

  const onFileAdd = async (file: File) => {
    setPegFiles([...pegFiles, { file, name: file.name } as PegFile]);
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

  const handleSubmit = async () => {
    const newPegFiles: PegFile[] = [];

    setFilesLoading(true);
    try {
      for (const pegFile of pegFiles) {
        if (pegFile.id) {
          newPegFiles.push(pegFile);
        } else {
          const pegFileUploaded: PegFile = await apiUploadFile(pegFile.file);
          newPegFiles.push(pegFileUploaded);
        }
      }

      for (const pegFileIdToDelete of pegFilesIdToDelete) {
        apiDeleteFile(pegFileIdToDelete);
      }

      await dispatch(
        updateCurrentProject({
          documentId: project.documentId,
          images: newPegFiles.map(({ id }) => id) as unknown as PegFile[],
        })
      );
      setPegFilesChanged(false);
    } finally {
      setFilesLoading(false);
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
          <Loading loading={filesLoading}>
            <Upload
              multiple
              showList
              draggable
              beforeUpload={beforeUpload}
              onFileAdd={(file) => onFileAdd(file)}
              onFileRemove={(file) => onFileRemove(file)}
              field={{ name: 'images' }}
              fileList={pegFiles.map((pegFile) => {
                const file = pegFile.file as File & { previewUrl?: string };
                file.previewUrl = pegFile.url;
                return file;
              })}
              clickable
            />
            {pegFilesChanged && (
              <div style={{ marginTop: '16px' }}>
                <Button variant="solid" onClick={handleSubmit} loading={filesLoading}>
                  Enregistrer
                </Button>
              </div>
            )}
          </Loading>
        </div>
        <DetailsRight />
      </div>
    </Container>
  );
};

export default Files;
