import { Editor, useEditorState } from '@tiptap/react'
import { Button } from '@/components/ui' 
import { 
    HiBold, 
    HiItalic, 
    HiStrikethrough,
    HiListBullet, 
    HiQueueList, // Pour la liste ordonnée
    HiMiniCodeBracket, // Pour le bloc de code
    HiOutlineChatBubbleBottomCenterText // Pour la citation
} from 'react-icons/hi2'
import { menuBarStateSelector } from './menuBarState'

const MenuBar = ({ editor }: { editor: Editor | null }) => {
    /*if (!editor) return null

    const btnClass = (name: string, attrs?: any) => 
        editor.isActive(name, attrs) ? 'bg-gray-600 text-blue-600' : 'text-gray-300 hover:bg-gray-600 hover:text-white'
*/
    const editorState = useEditorState({
        editor,
        selector: menuBarStateSelector,
    })

    if (!editor) {
        return null
    }

    return (
        <div className="flex flex-wrap gap-1 p-2 border-b bg-gray-700 rounded-t-md border-gray-200">
            {/* Titres H1 et H2 */}
            <Button
                size="sm" variant="plain" type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                active={editorState.isHeading1}
            >
                <span className="font-bold">H1</span>
            </Button>
            <Button
                size="sm" variant="plain" type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                active={editorState.isHeading2}
            >
                <span className="font-bold">H2</span>
            </Button>

            <div className="w-[1px] h-6 bg-gray-300 mx-1 self-center" />

            {/* Formattage de base */}
            <Button
                size="sm" variant="plain" type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editorState.canBold}
                active={editorState.isBold}
            >
                <HiBold size={18} />
            </Button>
            <Button
                size="sm" variant="plain" type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editorState.canItalic}
                active={editorState.isItalic}
            >
                <HiItalic size={18} />
            </Button>
            <Button
                size="sm" variant="plain" type="button"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                disabled={!editorState.canStrike}
                active={editorState.isStrike}
            >
                <HiStrikethrough size={18} />
            </Button>

            <div className="w-[1px] h-6 bg-gray-300 mx-1 self-center" />

            {/* Listes */}
            <Button
                size="sm" variant="plain" type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                active={editorState.isBulletList}
            >
                <HiListBullet size={18} />
            </Button>
            <Button
                size="sm" variant="plain" type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                active={editorState.isOrderedList}
            >
                <HiQueueList size={18} />
            </Button>

            <div className="w-[1px] h-6 bg-gray-300 mx-1 self-center" />

            {/* Bloc de citation et Code */}
            <Button
                size="sm" variant="plain" type="button"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                active={editorState.isBlockquote}
            >
                <HiOutlineChatBubbleBottomCenterText size={18} />
            </Button>
            <Button
                size="sm" variant="plain" type="button"
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                active={editorState.isCodeBlock}
            >
                <HiMiniCodeBracket size={18} />
            </Button>
        </div>
    )
}

export default MenuBar