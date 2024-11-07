import FileUplaodCustom from '@/components/shared/Upload';
import { Upload } from '@/components/ui';

function UploadSection({
  className,
  label,
  acceptedFileTypes,
}: {
  className: string;
  label: string;
  acceptedFileTypes: string;
}) {
  const tip = <p className="mt-2">{acceptedFileTypes}</p>;
  return (
    <div className={className}>
      <p className="text-sm text-gray-400 mb-2 ">{label}</p>
      <Upload tip={tip} />
    </div>
  );
}

export default UploadSection;
