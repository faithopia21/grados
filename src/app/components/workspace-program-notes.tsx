import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { useSelection } from '../../hooks/useSelection';
import { Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import {
  formatNoteCardTimestamp,
  parseNoteContent,
  serializeNoteContent,
} from '../../lib/note-format';

export interface ProgramNoteRow {
  id: string;
  program_id: string;
  content: string;
  updated_at: string | null;
}

type DraftNote = {
  id: string;
  title: string;
  content: string;
  isNew?: boolean;
};

function AutoExpandTextarea({
  value,
  onChange,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => {
        onChange(e.target.value);
        resize();
      }}
      placeholder={placeholder}
      rows={1}
      className={`w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word' }}
    />
  );
}

interface WorkspaceProgramNotesProps {
  programId: string;
}

export function WorkspaceProgramNotes({ programId }: WorkspaceProgramNotesProps) {
  const [notes, setNotes] = useState<ProgramNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftNote | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const noteSelection = useSelection();

  const handleBulkDeleteNotes = async () => {
    const ids = Array.from(noteSelection.selectedIds);
    const { error } = await supabase.from('program_notes').delete().in('id', ids);
    if (!error) {
      setNotes(prev => prev.filter(n => !noteSelection.selectedIds.has(n.id)));
      noteSelection.clearSelection();
      toast.success(`${ids.length} notes deleted`);
    } else {
      toast.error('Failed to delete notes');
    }
  };

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('program_notes')
      .select('*')
      .eq('program_id', programId)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setNotes(data as ProgramNoteRow[]);
    }
    setLoading(false);
  }, [programId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const startNewNote = () => {
    setEditingId('new');
    setDraft({
      id: `temp-${Date.now()}`,
      title: '',
      content: '',
      isNew: true,
    });
    setDeleteConfirmId(null);
  };

  const startEditNote = (note: ProgramNoteRow) => {
    const parsed = parseNoteContent(note.content);
    setEditingId(note.id);
    setDraft({
      id: note.id,
      title: parsed.title,
      content: parsed.content,
    });
    setDeleteConfirmId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);

    const payload = {
      program_id: programId,
      content: serializeNoteContent(draft.title, draft.content),
      updated_at: new Date().toISOString(),
    };

    if (draft.isNew) {
      const { data, error } = await supabase
        .from('program_notes')
        .insert(payload)
        .select()
        .single();

      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      setNotes(prev => [data as ProgramNoteRow, ...prev]);
    } else {
      const { data, error } = await supabase
        .from('program_notes')
        .update({
          content: payload.content,
          updated_at: payload.updated_at,
        })
        .eq('id', draft.id)
        .select()
        .single();

      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      setNotes(prev =>
        prev.map(n => (n.id === draft.id ? (data as ProgramNoteRow) : n))
      );
    }

    cancelEdit();
  };

  const handleDelete = async (noteId: string) => {
    const { error } = await supabase.from('program_notes').delete().eq('id', noteId);

    if (error) {
      toast.error(error.message);
      return;
    }

    setNotes(prev => prev.filter(n => n.id !== noteId));
    setDeleteConfirmId(null);
    if (editingId === noteId) {
      cancelEdit();
    }
  };

  const showNewCard = editingId === 'new' && draft?.isNew;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Notes</h2>
        <Button
          size="sm"
          className="bg-[#4F46E5] hover:bg-[#4338CA] text-white min-h-[44px]"
          onClick={startNewNote}
          disabled={editingId === 'new'}
        >
          + New Note
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading notes...</p>
      ) : notes.length === 0 && !showNewCard ? (
        <div className="py-16 text-center space-y-4">
          <p className="text-muted-foreground">No notes yet</p>
          <Button
            className="bg-[#4F46E5] hover:bg-[#4338CA] text-white min-h-[44px]"
            onClick={startNewNote}
          >
            + New Note
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {noteSelection.isSelectionMode && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox 
                  checked={noteSelection.selectedIds.size === notes.length && notes.length > 0}
                  onCheckedChange={() => noteSelection.selectAll(notes.map(n => n.id))}
                />
                <span className="text-sm font-medium">
                  {noteSelection.selectedIds.size} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={noteSelection.clearSelection}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleBulkDeleteNotes}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </div>
          )}

          {showNewCard && draft && (
            <NoteEditCard
              draft={draft}
              saving={saving}
              onTitleChange={title => setDraft(d => (d ? { ...d, title } : d))}
              onContentChange={content => setDraft(d => (d ? { ...d, content } : d))}
              onSave={handleSave}
              onCancel={cancelEdit}
            />
          )}

          {notes.map(note => {
            if (editingId === note.id && draft && !draft.isNew) {
              return (
                <NoteEditCard
                  key={note.id}
                  draft={draft}
                  saving={saving}
                  onTitleChange={title => setDraft(d => (d ? { ...d, title } : d))}
                  onContentChange={content => setDraft(d => (d ? { ...d, content } : d))}
                  onSave={handleSave}
                  onCancel={cancelEdit}
                />
              );
            }

            const parsed = parseNoteContent(note.content);
            const isSelected = noteSelection.selectedIds.has(note.id);

            return (
              <div
                key={note.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  noteSelection.toggleSelection(note.id, true);
                }}
                onClick={(e) => {
                  if (noteSelection.isSelectionMode) {
                    e.preventDefault();
                    e.stopPropagation();
                    noteSelection.toggleSelection(note.id);
                  }
                }}
                className={`border transition-colors rounded-[12px] p-4 flex flex-col gap-3 ${isSelected ? 'border-[#4F46E5] bg-[#4F46E5]/5' : 'bg-card border-border'} ${noteSelection.isSelectionMode ? 'cursor-pointer hover:bg-accent/30' : ''}`}
              >
                {deleteConfirmId === note.id ? (
                  <div className="space-y-3">
                    <p className="text-sm">Delete this note?</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[#DC2626] border-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/30 min-h-[44px]"
                        onClick={() => handleDelete(note.id)}
                      >
                        Yes, delete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteConfirmId(null)}
                        className="min-h-[44px]"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {parsed.title ? (
                      <p className="text-[14px] font-semibold break-words">{parsed.title}</p>
                    ) : null}
                    {parsed.content ? (
                      <p
                        className="text-[13px] text-muted-foreground leading-[1.6] break-words whitespace-pre-wrap"
                        style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                      >
                        {parsed.content}
                      </p>
                    ) : (
                      <p className="text-[13px] text-muted-foreground italic">Empty note</p>
                    )}
                    <div className="flex items-end justify-between gap-2 mt-auto pt-1">
                      <p className="text-[11px] text-muted-foreground">
                        {formatNoteCardTimestamp(note.updated_at)}
                      </p>
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent min-h-[44px] min-w-[44px] flex items-center justify-center"
                          onClick={(e) => { e.stopPropagation(); startEditNote(note); }}
                          aria-label="Edit note"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="p-2 rounded-md text-muted-foreground hover:text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/30 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(note.id); }}
                          aria-label="Delete note"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NoteEditCard({
  draft,
  saving,
  onTitleChange,
  onContentChange,
  onSave,
  onCancel,
}: {
  draft: DraftNote;
  saving: boolean;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-[12px] p-4 flex flex-col gap-3">
      <Input
        placeholder="Title"
        value={draft.title}
        onChange={e => onTitleChange(e.target.value)}
        className="border-0 shadow-none px-0 text-[14px] font-semibold focus-visible:ring-0"
      />
      <AutoExpandTextarea
        value={draft.content}
        onChange={onContentChange}
        placeholder="Write your note here..."
      />
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          className="bg-[#4F46E5] hover:bg-[#4338CA] text-white min-h-[44px] flex-1"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
          className="min-h-[44px] flex-1"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
