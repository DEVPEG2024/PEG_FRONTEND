import { Image } from '@/@types/product';
import { Avatar, Upload } from '@/components/ui'
import { PiUploadDuotone } from "react-icons/pi";

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
function FileUplaodCustom({image, setImage}: {image?: Image | undefined, setImage: (image: Image | undefined) => void}) {
  const onFileAdd = async (
    file: File
  ) => {
    setImage({file, name: file.name});
  };

  const onFileRemove = () => {
    setImage(undefined);
  };
  return (
    <Upload
      className="cursor-pointer"
      uploadLimit={1}
      showList
      beforeUpload={beforeUpload}
      onFileAdd={onFileAdd}
      onFileRemove={onFileRemove}
      fileList={image ? [image.file] : []}
    >
      <Avatar
        size={45}
        className="text-gray-500 border-2 border-dashed border-gray-500 rounded-md p-2 bg-gray-900"
        icon={<PiUploadDuotone />}
      />
    </Upload>
  );
}

export default FileUplaodCustom
