import { forwardRef, useRef, useState, useCallback, useEffect } from 'react'
import classNames from 'classnames'
import { Reorder, useDragControls } from 'framer-motion'
import { MdDragIndicator } from 'react-icons/md'
import { useConfig } from '../ConfigProvider'
import cloneDeep from 'lodash/cloneDeep'
import FileItem from './FileItem'
import Button from '../Button/Button'
import CloseButton from '../CloseButton'
import type { CommonProps } from '../@types/common'
import type { ReactNode, ChangeEvent, MouseEvent, KeyboardEvent } from 'react'
import { toast } from 'react-toastify'

export interface UploadProps extends CommonProps {
    accept?: string
    beforeUpload?: (file: FileList | null, fileList: File[]) => boolean | string
    disabled?: boolean
    draggable?: boolean
    fileList?: File[]
    fileListClass?: string
    fileItemClass?: string
    multiple?: boolean
    onChange?: (file: File[], fileList: File[]) => void
    onFileAdd?: (file: File) => void
    /** `index` : position du fichier retiré (deux fichiers peuvent avoir le même nom) */
    onFileRemove?: (file: string, index: number) => void
    showList?: boolean
    tip?: string | ReactNode
    uploadLimit?: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    field?: any
    clickable?: boolean
    renderFileActions?: (file: File, index: number) => ReactNode
    /**
     * Ordre modifiable à la main : poignée à faire glisser (souris ou doigt), ou
     * flèches haut/bas du clavier sur la poignée. `order` = indices de l'ancienne
     * liste dans le nouvel ordre (`next[i] = prev[order[i]]`).
     */
    onReorder?: (order: number[]) => void
}

/** Nouvel ordre (indices de l'ancienne liste) quand l'élément `index` avance de `step`. */
export const moveOrder = (length: number, index: number, step: number): number[] | null => {
    const target = index + step
    if (index < 0 || index >= length || target < 0 || target >= length) return null
    const order = Array.from({ length }, (_, i) => i)
    order.splice(target, 0, ...order.splice(index, 1))
    return order
}

type SortableFileRowProps = {
    value: string
    index: number
    count: number
    label: string
    onMove: (index: number, step: -1 | 1) => void
    /** Reçoit la poignée, à placer dans la rangée d'actions. */
    children: (handle: ReactNode) => ReactNode
}

/** Ligne déplaçable : seule la poignée lance le glissement (les boutons restent cliquables). */
const SortableFileRow = ({ value, index, count, label, onMove, children }: SortableFileRowProps) => {
    const controls = useDragControls()
    const onHandleKey = (e: KeyboardEvent) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
        e.preventDefault()
        onMove(index, e.key === 'ArrowUp' ? -1 : 1)
    }
    const handle = count > 1 ? (
        <button
            type="button"
            className="upload-file-handle"
            aria-label={`Déplacer ${label} (flèches haut et bas)`}
            title="Glisser pour changer l'ordre"
            onPointerDown={(e) => {
                e.preventDefault()
                controls.start(e)
            }}
            onKeyDown={onHandleKey}
        >
            <MdDragIndicator size={18} aria-hidden="true" />
        </button>
    ) : null
    return (
        <Reorder.Item
            as="div"
            value={value}
            dragListener={false}
            dragControls={controls}
            style={{ position: 'relative' }}
            whileDrag={{ scale: 1.02, zIndex: 2, boxShadow: '0 12px 30px rgba(0, 0, 0, 0.45)' }}
        >
            {children(handle)}
        </Reorder.Item>
    )
}

const filesToArray = (files: File[]) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.keys(files).map((key) => files[key as any])

const Upload = forwardRef<HTMLDivElement, UploadProps>((props, ref) => {
    const {
        accept,
        beforeUpload,
        disabled = false,
        draggable = false,
        fileList = [],
        fileListClass,
        fileItemClass,
        multiple,
        onChange,
        onFileAdd,
        onFileRemove,
        showList = true,
        tip,
        uploadLimit,
        children,
        className,
        field,
        clickable = false,
        renderFileActions,
        onReorder,
        ...rest
    } = props

    const fileInputField = useRef<HTMLInputElement>(null)
    const [files, setFiles] = useState(fileList)
    const [dragOver, setDragOver] = useState(false)
    // Clé stable par fichier (un nom peut revenir deux fois) pour le réordonnancement.
    const fileKeys = useRef(new WeakMap<File, string>())
    const keyCounter = useRef(0)
    const keyOf = (file: File) => {
        let key = fileKeys.current.get(file)
        if (!key) {
            key = `f${++keyCounter.current}`
            fileKeys.current.set(file, key)
        }
        return key
    }

    const { themeColor, primaryColorLevel } = useConfig()

    useEffect(() => {
        if (JSON.stringify(files) !== JSON.stringify(fileList)) {
            setFiles(fileList)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(fileList)])

    const triggerMessage = (msg: string | ReactNode = '') => {
        toast.error(msg || 'L\'upload a échoué !')
    }

    const pushFile = (newFiles: FileList | null, file: File[]) => {
        if (newFiles) {
            for (const f of newFiles) {
                file.push(f)
            }
        }

        return file
    }

    const addNewFiles = (newFiles: FileList | null) => {
        let file = cloneDeep(files)
        if (typeof uploadLimit === 'number' && uploadLimit !== 0) {
            if (Object.keys(file).length >= uploadLimit) {
                if (uploadLimit === 1) {
                    file.shift()
                    file = pushFile(newFiles, file)
                }

                return filesToArray({ ...file })
            }
        }
        file = pushFile(newFiles, file)
        return filesToArray({ ...file })
    }

    const onNewFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const { files: newFiles } = e.target
        let result: boolean | string = true

        if (beforeUpload) {
            result = beforeUpload(newFiles, files)

            if (result === false) {
                triggerMessage()
                return
            }

            if (typeof result === 'string' && result.length > 0) {
                triggerMessage(result)
                return
            }
        }

        if (result) {
            const updatedFiles = addNewFiles(newFiles)
            setFiles(updatedFiles)
            onChange?.(updatedFiles, files)
            if (newFiles) {
                for (let i = 0; i < newFiles.length; i++) {
                    onFileAdd?.(newFiles[i])
                }
            }
        }
    }

    const removeFile = (fileIndex: number) => {
        onFileRemove?.(files.find((_, index) => index === fileIndex)?.name ?? '', fileIndex)
        const deletedFileList = files.filter((_, index) => index !== fileIndex)
        setFiles(deletedFileList)
    }

    const applyOrder = (order: number[]) => {
        if (order.length !== files.length || order.some((i) => files[i] === undefined)) return
        setFiles(order.map((i) => files[i]))
        onReorder?.(order)
    }

    const onReorderKeys = (nextKeys: string[]) => {
        const prevKeys = files.map(keyOf)
        applyOrder(nextKeys.map((key) => prevKeys.indexOf(key)))
    }

    const moveFile = (index: number, step: -1 | 1) => {
        const order = moveOrder(files.length, index, step)
        if (order) applyOrder(order)
    }

    const triggerUpload = (e: MouseEvent<HTMLDivElement>) => {
        if (!disabled) {
            fileInputField.current?.click()
        }
        e.stopPropagation()
    }

    const renderChildren = () => {
        if (!draggable && !children) {
            return (
                <Button disabled={disabled} onClick={(e) => e.preventDefault()}>
                    Upload
                </Button>
            )
        }

        if (draggable && !children) {
            return <span>Choisir un fichier ou glisser et déposer ici</span>
        }

        return children
    }

    const handleDragLeave = useCallback(() => {
        if (draggable) {
            setDragOver(false)
        }
    }, [draggable])

    const handleDragOver = useCallback(() => {
        if (draggable && !disabled) {
            setDragOver(true)
        }
    }, [draggable, disabled])

    const handleDrop = useCallback(() => {
        if (draggable) {
            setDragOver(false)
        }
    }, [draggable])

    const draggableProp = {
        onDragLeave: handleDragLeave,
        onDragOver: handleDragOver,
        onDrop: handleDrop,
    }

    const renderItemActions = (file: File, index: number, handle?: ReactNode) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {handle}
            {renderFileActions?.(file, index)}
            <CloseButton
                className="upload-file-remove"
                onClick={() => removeFile(index)}
            />
        </div>
    )

    const draggableEventFeedbackClass = `border-${themeColor}-${primaryColorLevel}`

    const uploadClass = classNames(
        'upload',
        draggable && `upload-draggable`,
        draggable && !disabled && `hover:${draggableEventFeedbackClass}`,
        draggable && disabled && 'disabled',
        dragOver && draggableEventFeedbackClass,
        className
    )

    const uploadInputClass = classNames(
        'upload-input',
        draggable && `draggable`
    )

    return (
        <>
            <div
                ref={ref}
                className={uploadClass}
                {...(draggable ? draggableProp : { onClick: triggerUpload })}
                {...rest}
            >
                <input
                    ref={fileInputField}
                    className={uploadInputClass}
                    type="file"
                    disabled={disabled}
                    multiple={multiple}
                    accept={accept}
                    title=""
                    value=""
                    onChange={onNewFileUpload}
                    {...field}
                    {...rest}
                ></input>
                {renderChildren()}
            </div>
            {tip}
            {showList && !onReorder && (
                <div className={classNames('upload-file-list', fileListClass)}>
                    {files.map((file, index) => (
                        <FileItem key={file.name + index} file={file} clickable={clickable} className={fileItemClass}>
                            {renderItemActions(file, index)}
                        </FileItem>
                    ))}
                </div>
            )}
            {showList && onReorder && (
                <Reorder.Group
                    as="div"
                    axis="y"
                    values={files.map(keyOf)}
                    className={classNames('upload-file-list', fileListClass)}
                    onReorder={onReorderKeys}
                >
                    {files.map((file, index) => (
                        <SortableFileRow
                            key={keyOf(file)}
                            value={keyOf(file)}
                            index={index}
                            count={files.length}
                            label={`« ${(file as File & { displayName?: string }).displayName ?? file.name} »`}
                            onMove={moveFile}
                        >
                            {(handle) => (
                                <FileItem file={file} clickable={clickable} className={fileItemClass}>
                                    {renderItemActions(file, index, handle)}
                                </FileItem>
                            )}
                        </SortableFileRow>
                    ))}
                </Reorder.Group>
            )}
        </>
    )
})

Upload.displayName = 'Upload'

export default Upload
