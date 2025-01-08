import { Image } from '@/@types/image';
import { Upload } from '@/components/ui'
const beforeUpload = (files: FileList | null) => {
  let valid: string | boolean = true

  const allowedFileType = [
    'image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp',
    'application/pdf', 'application/postscript', 'application/illustrator', 'image/vnd.adobe.photoshop'
  ]
  if (files) {
      for (const file of files) {
          if (!allowedFileType.includes(file.type)) {
              valid = 'Veuillez uploader un fichier valide'
          }
      }
  }

  return valid
}

function FileUplaodDragLight({
  setImage,
}: {
  setImage: (image: Partial<Image> | undefined) => void;
}) {
  const onFileAdd = async (
    file: File
  ) => {
    setImage({file, name: file.name});
  };

  const onFileRemove = (
  ) => {
    setImage(undefined);
  };

  return (
    <Upload
      className="cursor-pointer"
      uploadLimit={1}
      draggable
      beforeUpload={beforeUpload}
      onFileAdd={onFileAdd}
      onFileRemove={onFileRemove}
    />
  );
}

export default FileUplaodDragLight
