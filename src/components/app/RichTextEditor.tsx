import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import MenuBar from './MenuBar';

// --- Le Composant Principal ---
type RichTextEditorProps = {
  value: string;
  onChange?: (val: string) => void;
  readOnly?: boolean;
};

const RichTextEditor = ({ value, onChange, readOnly }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        // "prose" de Tailwind Typography rend le HTML joli automatiquement
        class: `prose prose-sm prose-invert focus:outline-hidden min-h-[150px] max-w-none p-4 ${
          !readOnly ? 'bg-gray-700' : ''
        }`,
      },
    },
  });

  // TipTap 3 détruit l'éditeur s'il n'est pas monté 1 ms après sa création
  // (rendu lent : téléphone, page chargée), puis en crée un autre. Ce rendu, ou
  // l'effet qui le suit, peut encore porter l'ancien, au schéma nul : getHTML()
  // levait « Cannot read properties of null (reading 'cached') » et toute la page
  // tombait. Un éditeur détruit n'est donc jamais utilisé — vérifié au rendu ET
  // dans l'effet (la destruction tombe souvent entre les deux) ; le rendu suivant
  // apporte le nouveau.
  const live = editor && !editor.isDestroyed ? editor : null;

  useEffect(() => {
    const editor = live;
    if (!editor || editor.isDestroyed) return;
    // Only sync external value when it's empty (reset after submit)
    // or when the editor is not focused (external change)
    if (value === '' && editor.getHTML() !== '<p></p>') {
      editor.commands.setContent('');
    } else if (!editor.isFocused && value && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, live]);

  return (
    <div
      className={`w-full overflow-hidden ${!readOnly ? 'border border-gray-200 rounded-md shadow-xs bg-gray-700' : ''}`}
    >
      {!readOnly && <MenuBar editor={live} />}
      <EditorContent editor={live} />
    </div>
  );
};

export default RichTextEditor;
