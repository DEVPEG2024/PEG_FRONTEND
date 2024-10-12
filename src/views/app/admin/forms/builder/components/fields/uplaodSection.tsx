import { Upload } from '@/components/ui'

function UploadSection({className, label, acceptedFileTypes, value, onFileAdd}: {className: string, label: string, acceptedFileTypes: string, value: File[], onFileAdd: Function}) {
  const tip = <p className="mt-2">{acceptedFileTypes}</p>

  return (
    <div className={className}>
        <p className="text-sm text-gray-400 mb-2 ">{label}</p>    
        <Upload tip={tip} onFileAdd={(file) => onFileAdd(file)} fileList={value ?? []}/>
    </div>
  )
}

export default UploadSection
