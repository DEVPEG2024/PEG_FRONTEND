import FileUplaodCustom from '@/components/shared/Upload'
import { Upload } from '@/components/ui'

function UploadSection({className, label, acceptedFileTypes, onChange}: {className: string, label: string, acceptedFileTypes: string, onChange: Function}) {
  const tip = <p className="mt-2">{acceptedFileTypes}</p>
  return (
    <div className={className}>
        <p className="text-sm text-gray-400 mb-2 ">{label}</p>    
        <Upload tip={tip} onChange={(file, fileList) => onChange(file)}/>
    </div>
  )
}

export default UploadSection
