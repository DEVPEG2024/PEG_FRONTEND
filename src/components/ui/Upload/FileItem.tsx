import { VscFilePdf, VscFileZip, VscFile } from 'react-icons/vsc'
import type { CommonProps } from '../@types/common'

const BYTE = 1000
const getKB = (bytes: number) => Math.round(bytes / BYTE)

const FileIcon = ({ children }: CommonProps) => {
    return <span className="text-4xl">{children}</span>
}

export interface FileItemProps extends CommonProps {
    file: File;
    clickable: boolean;
}

const FileItem = (props: FileItemProps) => {
    const { file, clickable, children } = props
    // previewUrl / displayName sont des propriétés custom parfois attachées
    // au File par l'app (displayName : nom lisible sans marqueurs techniques)
    const { type, name, size } = file
    const previewUrl = (file as File & { previewUrl?: string }).previewUrl
    const displayName = (file as File & { displayName?: string }).displayName ?? name

    const renderThumbnail = () => {
        const isImageFile = type.split('/')[0] === 'image'

        if (isImageFile || previewUrl) {
            return (
                <img
                    className="upload-file-image"
                    src={previewUrl || URL.createObjectURL(file)}
                    alt={`file preview ${name}`}
                />
            )
        }

        if (type === 'application/zip') {
            return (
                <FileIcon>
                    <VscFileZip />
                </FileIcon>
            )
        }

        if (type === 'application/pdf') {
            return (
                <FileIcon>
                    <VscFilePdf />
                </FileIcon>
            )
        }

        return (
            <FileIcon>
                <VscFile />
            </FileIcon>
        )
    }

    return (
        <div className="upload-file">
            <div className="flex">
                <div className="upload-file-thumbnail">{renderThumbnail()}</div>
                <div className="upload-file-info">
                    {clickable ? <a className="upload-file-name font-bold" target="_blank" href={previewUrl}>{displayName}</a> : <h6 className="upload-file-name" title={name}>{displayName}</h6>}
                    <span className="upload-file-size">{getKB(size)} kb</span>
                </div>
            </div>
            {children}
        </div>
    )
}

FileItem.displayName = 'UploadFileItem'

export default FileItem
