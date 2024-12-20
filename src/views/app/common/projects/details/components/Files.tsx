import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import AdaptableCard from '@/components/shared/AdaptableCard';
import Container from '@/components/shared/Container';
import DetailsRight from './DetailsRight';
import { Image } from '@/@types/product';
import { Upload } from '@/components/ui';
import { useAppDispatch } from '@/store';
import { setLoading, updateProject, useAppSelector } from '../store';
import { apiLoadImagesAndFiles, apiUploadFile } from '@/services/FileServices';
import { Loading } from '@/components/shared';

const Files = () => {
  const [images, setImages] = useState<Image[]>([])
  const [imagesChanged, setImagesChanged] = useState<boolean>(false);
  const dispatch = useAppDispatch();
  const {project, loading} = useAppSelector((state) => state.projectDetails.data);
  
  useEffect(() => {
      fetchFiles();
    }, [project]);

  const fetchFiles = async (): Promise<void> => {
    if (project?.images?.length > 0){
      const imagesLoaded: Image[] = await apiLoadImagesAndFiles(project?.images)

      setImages(imagesLoaded);
    }
  };

  const onFileAdd = async (
    file: File
  ) => {
    setImages([...images, {file, name: file.name}]);
    setImagesChanged(true);
  };

  const onFileRemove = (
    fileName: string
  ) => {
    const imageToDelete: Image | undefined = images.find(({name}) => name === fileName)

    if (imageToDelete) {
      setImages(images.filter(({name}) => name !== fileName));
      setImagesChanged(true);
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

  const handleSubmit = async () => {
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

    dispatch(updateProject({documentId: project.documentId, images: newImages.map(({id}) => id)}))
    setImages([])
    setImagesChanged(false);
  }

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
                onFileAdd={(file) =>
                  onFileAdd(file)
                }
                onFileRemove={(file) =>
                  onFileRemove(file)
                }
                field={{ name: 'images' }}
                fileList={images.map((image) => {
                  const file = image.file

                  file.previewUrl = image.url
                  return file
                })}
                clickable
              />
              {imagesChanged && (
                <Button variant="solid" onClick={handleSubmit} loading={loading}>
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
