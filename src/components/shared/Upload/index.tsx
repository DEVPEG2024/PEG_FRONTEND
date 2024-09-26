import { Avatar, Upload } from '@/components/ui'
import { API_BASE_URL, API_URL_IMAGE } from '@/configs/api.config'
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
function FileUplaodCustom({setImage, setFileType}: {image: string, setImage: (image: string) => void, setFileType: (type: string) => void}) {
  const onFileUpload = async (
    files: File[],
    setImage: (image: string) => void,
    setFileType: (fileType: string) => void
  ) => {
    const formData = new FormData();
    formData.append("file", files[0]);
    try {
      const response = await fetch(API_BASE_URL + "/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      const fileUrl = data.fileName;
      setImage(fileUrl);
      setFileType(files[0].type);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };
  return (
    <Upload
      className="cursor-pointer"
      uploadLimit={1}
      showList
      beforeUpload={beforeUpload}
      onChange={(files) => onFileUpload(files, setImage, setFileType)}
      onFileRemove={() => {
        setImage("");
        setFileType("");
      }}
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
