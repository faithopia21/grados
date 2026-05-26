import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { LineHeight } from './extensions/line-height';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  MoreHorizontal,
  ChevronUp,
} from 'lucide-react';
import { Toggle } from './ui/toggle';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

const EditorButton = ({
  icon: Icon,
  label,
  isActive,
  onClick,
  disabled = false,
  hiddenOnMobile = false,
}: {
  icon: any;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  disabled?: boolean;
  hiddenOnMobile?: boolean;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Toggle
        size="sm"
        pressed={isActive}
        onPressedChange={onClick}
        disabled={disabled}
        aria-label={label}
        className={hiddenOnMobile ? 'hidden sm:inline-flex' : ''}
      >
        <Icon className="h-4 w-4" />
      </Toggle>
    </TooltipTrigger>
    <TooltipContent side="top" className="z-[100]">
      {label}
    </TooltipContent>
  </Tooltip>
);

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write something...',
  minHeight = '150px',
  className = '',
}: RichTextEditorProps) {
  const [showToolbar, setShowToolbar] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      LineHeight.configure({
        defaultLineHeight: '1.0',
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: `prose dark:prose-invert max-w-none focus:outline-none w-full h-full`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) {
      return;
    }
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const currentLineHeight = editor.getAttributes('paragraph').lineHeight || editor.getAttributes('heading').lineHeight || '1.0';

  return (
    <div className={`flex flex-col border border-border rounded-md overflow-hidden bg-background ${className}`}>
      <div className="flex items-center justify-end px-2 py-1 border-b border-border bg-muted/10">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
          onClick={() => setShowToolbar(!showToolbar)}
          aria-label={showToolbar ? 'Hide formatting toolbar' : 'Show formatting toolbar'}
        >
          {showToolbar ? (
            <>
              <ChevronUp className="h-3.5 w-3.5 mr-1" />
              Hide Tools
            </>
          ) : (
            <>
              <MoreHorizontal className="h-3.5 w-3.5 mr-1" />
              Format
            </>
          )}
        </Button>
      </div>

      {showToolbar && (
        <TooltipProvider delayDuration={300}>
          <div className="flex flex-wrap items-center gap-1 p-1 bg-muted/30 border-b border-border sticky top-0 z-10 shrink-0 transition-all">
            <EditorButton
              icon={Undo}
              label="Undo (Cmd+Z)"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
            />
            <EditorButton
              icon={Redo}
              label="Redo (Cmd+Shift+Z)"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
            />

            <Separator orientation="vertical" className="h-6 mx-1" />

            <div className="flex items-center mx-1">
              <Select
                value={currentLineHeight}
                onValueChange={(val) => editor.chain().focus().setLineHeight(val).run()}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SelectTrigger className="h-8 px-2 text-xs border-transparent hover:bg-accent focus:ring-0 gap-1 w-[65px] bg-transparent">
                      <SelectValue placeholder="Spacing" />
                    </SelectTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="z-[100]">Line Spacing</TooltipContent>
                </Tooltip>
                <SelectContent>
                  <SelectItem value="1.0">1.0</SelectItem>
                  <SelectItem value="1.15">1.15</SelectItem>
                  <SelectItem value="1.5">1.5</SelectItem>
                  <SelectItem value="2.0">2.0</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <EditorButton
              icon={Bold}
              label="Bold"
              isActive={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}
            />
            <EditorButton
              icon={Italic}
              label="Italic"
              isActive={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            />
            <EditorButton
              icon={UnderlineIcon}
              label="Underline"
              isActive={editor.isActive('underline')}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            />
            <EditorButton
              icon={Strikethrough}
              label="Strikethrough"
              isActive={editor.isActive('strike')}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            />

            <Separator orientation="vertical" className="h-6 mx-1" />

            <EditorButton
              icon={Heading1}
              label="Heading 1"
              isActive={editor.isActive('heading', { level: 1 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            />
            <EditorButton
              icon={Heading2}
              label="Heading 2"
              isActive={editor.isActive('heading', { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            />

            <Separator orientation="vertical" className="h-6 mx-1" />

            <EditorButton
              icon={List}
              label="Bullet List"
              isActive={editor.isActive('bulletList')}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            />
            <EditorButton
              icon={ListOrdered}
              label="Numbered List"
              isActive={editor.isActive('orderedList')}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            />

            <Separator orientation="vertical" className="h-6 mx-1" />

            <EditorButton
              icon={Quote}
              label="Blockquote"
              isActive={editor.isActive('blockquote')}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            />
            <EditorButton
              icon={Code}
              label="Code Block"
              isActive={editor.isActive('codeBlock')}
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            />
            <EditorButton
              icon={LinkIcon}
              label="Insert Link"
              isActive={editor.isActive('link')}
              onClick={setLink}
            />

            <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />

            <EditorButton
              icon={AlignLeft}
              label="Align Left"
              isActive={editor.isActive({ textAlign: 'left' })}
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              hiddenOnMobile
            />
            <EditorButton
              icon={AlignCenter}
              label="Align Center"
              isActive={editor.isActive({ textAlign: 'center' })}
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              hiddenOnMobile
            />
            <EditorButton
              icon={AlignRight}
              label="Align Right"
              isActive={editor.isActive({ textAlign: 'right' })}
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              hiddenOnMobile
            />
          </div>
        </TooltipProvider>
      )}

      <div
        className="flex-1 overflow-y-auto cursor-text [&_.ProseMirror]:min-h-full [&_.ProseMirror]:p-3 sm:[&_.ProseMirror]:p-4 [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p]:leading-[inherit] [&_.ProseMirror_li]:leading-[inherit]"
        style={{ minHeight, lineHeight: '1.0' }}
        onClick={() => editor.commands.focus()}
      >
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}
