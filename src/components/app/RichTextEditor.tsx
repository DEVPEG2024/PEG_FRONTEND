import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'
import MenuBar from './MenuBar'

// --- Le Composant Principal ---
type RichTextEditorProps = {
    value: string
    onChange?: (val: string) => void
    readOnly?: boolean
}

const RichTextEditor = ({ value, onChange, readOnly }: RichTextEditorProps) => {
    const editor = useEditor({
        extensions: [StarterKit],
        content: value,
        editable: !readOnly,
        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML())
        },
        editorProps: {
            attributes: {
                // "prose" de Tailwind Typography rend le HTML joli automatiquement
                class: `prose prose-sm prose-invert focus:outline-hidden min-h-[150px] max-w-none p-4 ${
                    !readOnly ? 'bg-gray-700' : ''
                }`,
            },
        },
    })

    useEffect(() => {
        if (!editor) return
        // Only sync external value when it's empty (reset after submit)
        // or when the editor is not focused (external change)
        if (value === '' && editor.getHTML() !== '<p></p>') {
            editor.commands.setContent('')
        } else if (!editor.isFocused && value && value !== editor.getHTML()) {
            editor.commands.setContent(value)
        }
    }, [value, editor])

    return (
        <div className={`w-full overflow-hidden ${!readOnly ? 'border border-gray-200 rounded-md shadow-xs bg-gray-700' : ''}`}>
            {!readOnly && <MenuBar editor={editor} />}
            <EditorContent editor={editor} />
        </div>
    )
}

export default RichTextEditor