import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useSelection } from '../../hooks/useSelection';
import { Pencil, Trash2, X, Check, NotebookPen, Search, ArrowUp, ArrowDown, Pin, PinOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import {
  formatNoteCardTimestamp,
  parseNoteContent,
  serializeNoteContent,
} from '../../lib/note-format';
import { RichTextEditor } from './rich-text-editor';

export interface ProgramNoteRow {
  id: string;
  program_id: string;
  content: string;
  updated_at: string | null;
  created_at?: string | null;
  is_pinned?: boolean;
  pinned_at?: string | null;
}


interface WorkspaceProgramNotesProps {
  programId: string;
}

export function WorkspaceProgramNotes({ programId }: WorkspaceProgramNotesProps) {
  const [notes, setNotes] = useState<ProgramNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [selectedNote, setSelectedNote] = useState<ProgramNoteRow | null>(null);
  const [noteOverlayOpen, setNoteOverlayOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'updated_at' | 'created_at' | 'name'>('updated_at');
  const [sortAscending, setSortAscending] = useState(false);
  
  const noteSelection = useSelection();

  const handleBulkDeleteNotes = async () => {
    const ids = Array.from(noteSelection.selectedIds);
    const { error, data } = await supabase.from('program_notes').delete().in('id', ids).select('id');
    
    if (!error) {
      const deletedIds = data ? data.map(d => d.id) : [];
      setNotes(prev => prev.filter(n => !deletedIds.includes(n.id)));
      noteSelection.clearSelection();
      
      if (deletedIds.length === ids.length) {
        toast.success(`${ids.length} notes deleted`);
      } else {
        toast.error(`Only deleted ${deletedIds.length} of ${ids.length} notes`);
        fetchNotes(); // Resync state if deletion was partial or failed
      }
    } else {
      toast.error('Failed to delete notes: ' + error.message);
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

  const startNewNote = async () => {
    const newNoteData = {
      program_id: programId,
      content: serializeNoteContent('', ''),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('program_notes')
      .insert(newNoteData)
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    const newNote = data as ProgramNoteRow;
    setNotes(prev => [newNote, ...prev]);
    setSelectedNote(newNote);
    setNoteOverlayOpen(true);
    setDeleteConfirmId(null);
  };

  const openNote = (note: ProgramNoteRow) => {
    setSelectedNote(note);
    setNoteOverlayOpen(true);
    setDeleteConfirmId(null);
  };

  const closeNote = () => {
    setNoteOverlayOpen(false);
    setSelectedNote(null);
  };

  const handleUpdateNote = (updated: ProgramNoteRow) => {
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
  };

  const handleDelete = async (noteId: string) => {
    if (!noteId) {
      toast.error('Invalid note ID');
      return;
    }

    // Optimistic update — remove from UI immediately
    setNotes(prev => prev.filter(n => n.id !== noteId));
    setDeleteConfirmId(null);

    const { error } = await supabase
      .from('program_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      // Delete failed on the server — restore correct state
      toast.error('Failed to delete note. Please try again.');
      fetchNotes();
      return;
    }

    toast.success('Note deleted');
  };

  const handleTogglePin = async (note: ProgramNoteRow, e: React.MouseEvent) => {
    e.stopPropagation();
    const newIsPinned = !note.is_pinned;
    const now = newIsPinned ? new Date().toISOString() : null;

    const { error } = await supabase
      .from('program_notes')
      .update({ is_pinned: newIsPinned, pinned_at: now })
      .eq('id', note.id);

    if (error) {
      toast.error('Failed to update pin status');
      return;
    }

    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, is_pinned: newIsPinned, pinned_at: now } : n));
  };

  const processedNotes = useMemo(() => {
    let result = [...notes];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(note => {
        const parsed = parseNoteContent(note.content);
        return (parsed.title?.toLowerCase() || '').includes(q) ||
               (parsed.content?.toLowerCase() || '').includes(q);
      });
    }

    result.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) {
        return a.is_pinned ? -1 : 1;
      }

      let comparison = 0;
      if (sortField === 'name') {
        const titleA = parseNoteContent(a.content).title || '';
        const titleB = parseNoteContent(b.content).title || '';
        comparison = titleA.localeCompare(titleB);
      } else if (sortField === 'created_at') {
        const timeA = new Date(a.created_at || a.updated_at || 0).getTime();
        const timeB = new Date(b.created_at || b.updated_at || 0).getTime();
        comparison = timeA - timeB;
      } else {
        const timeA = new Date(a.updated_at || 0).getTime();
        const timeB = new Date(b.updated_at || 0).getTime();
        comparison = timeA - timeB;
      }
      return sortAscending ? comparison : -comparison;
    });

    return result;
  }, [notes, searchQuery, sortField, sortAscending]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Notes</h2>
        <Button
          size="sm"
          className="bg-[#4F46E5] hover:bg-[#4338CA] text-white min-h-[44px]"
          onClick={startNewNote}
        >
          + New Note
        </Button>
      </div>

      {notes.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortField} onValueChange={(v: any) => setSortField(v)}>
              <SelectTrigger className="w-[160px] bg-background">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="created_at">Recently Added</SelectItem>
                <SelectItem value="updated_at">Recently Edited</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setSortAscending(!sortAscending)}
              className="shrink-0"
              aria-label="Toggle sort direction"
            >
              {sortAscending ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading notes...</p>
      ) : notes.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center space-y-4 border rounded-xl bg-card">
          <NotebookPen className="h-10 w-10 text-muted-foreground/40" strokeWidth={1.5} />
          <div className="space-y-1">
            <h3 className="text-[15px] font-medium text-muted-foreground">No notes yet</h3>
            <p className="text-[13px] text-muted-foreground/70">
              Click '+ New Note' to start writing
            </p>
          </div>
        </div>
      ) : processedNotes.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">No notes match your search.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {noteSelection.isSelectionMode && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox 
                  checked={noteSelection.selectedIds.size === processedNotes.length && processedNotes.length > 0}
                  onCheckedChange={() => noteSelection.selectAll(processedNotes.map(n => n.id))}
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

          {processedNotes.map(note => {
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
                  } else {
                    openNote(note);
                  }
                }}
                className={`border transition-colors rounded-[12px] p-4 flex flex-col gap-3 group relative cursor-pointer ${isSelected ? 'border-[#4F46E5] bg-[#4F46E5]/5' : 'bg-card border-border hover:bg-accent/30'} `}
              >
                {deleteConfirmId === note.id ? (
                  <div className="space-y-3" onClick={e => e.stopPropagation()}>
                    <p className="text-sm font-medium">Delete this note?</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[#DC2626] border-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/30 h-9"
                        onClick={() => handleDelete(note.id)}
                      >
                        Yes, delete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteConfirmId(null)}
                        className="h-9"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0">
                      {parsed.title ? (
                        <p className="text-[14px] font-bold truncate mb-1">{parsed.title}</p>
                      ) : null}
                      {parsed.content ? (
                        <p
                          className="text-[13px] text-muted-foreground leading-[1.5] line-clamp-2 overflow-hidden break-words whitespace-pre-line"
                        >
                          {parsed.content
                            .replace(/<(br)[^>]*>/gi, '\n')
                            .replace(/<\/(p|div|h[1-6]|ul|ol|li|blockquote)>/gi, '\n')
                            .replace(/<[^>]+>/g, '')
                            .replace(/\n\s*\n/g, '\n')
                            .trim()}
                        </p>
                      ) : (
                        <p className="text-[13px] text-muted-foreground italic">Empty note</p>
                      )}
                    </div>
                    
                    <div className="flex items-end justify-between gap-2 mt-auto pt-2">
                      <p className="text-[11px] text-muted-foreground">
                        {formatNoteCardTimestamp(note.updated_at)}
                      </p>
                      <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          className={`p-1.5 rounded-md transition-colors flex items-center justify-center ${note.is_pinned ? 'text-[#4F46E5] bg-[#4F46E5]/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
                          onClick={(e) => handleTogglePin(note, e)}
                          aria-label={note.is_pinned ? 'Unpin note' : 'Pin note'}
                        >
                          {note.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center justify-center"
                          onClick={() => openNote(note)}
                          aria-label="Edit note"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded-md text-muted-foreground hover:text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center justify-center"
                          onClick={() => setDeleteConfirmId(note.id)}
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

      {noteOverlayOpen && selectedNote && (
        <NoteOverlayEditor
          note={selectedNote}
          onClose={closeNote}
          onUpdateNote={handleUpdateNote}
        />
      )}
    </div>
  );
}

function NoteOverlayEditor({
  note,
  onClose,
  onUpdateNote,
}: {
  note: ProgramNoteRow;
  onClose: () => void;
  onUpdateNote: (updated: ProgramNoteRow) => void;
}) {
  const parsed = parseNoteContent(note.content);
  const [title, setTitle] = useState(parsed.title);
  const [content, setContent] = useState(parsed.content);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState(note.updated_at);
  const [mouseDownTarget, setMouseDownTarget] = useState<EventTarget | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const doSave = async (currentTitle: string, currentContent: string) => {
    setSaveStatus('saving');
    const updatedContentStr = serializeNoteContent(currentTitle, currentContent);
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('program_notes')
      .update({
        content: updatedContentStr,
        updated_at: now,
      })
      .eq('id', note.id);

    if (error) {
      toast.error('Failed to auto-save note');
      setSaveStatus('idle');
    } else {
      setLastSavedAt(now);
      setSaveStatus('saved');
      onUpdateNote({
        ...note,
        content: updatedContentStr,
        updated_at: now,
      });
    }
  };

  const handleChangeTitle = (v: string) => {
    setTitle(v);
    scheduleSave(v, content);
  };

  const handleChangeContent = (v: string) => {
    setContent(v);
    scheduleSave(title, v);
  };

  const scheduleSave = (t: string, c: string) => {
    setSaveStatus('saving');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      doSave(t, c);
    }, 1000);
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 sm:p-6"
      onPointerDown={(e) => setMouseDownTarget(e.target)}
      onPointerUp={(e) => {
        if (e.target === e.currentTarget && mouseDownTarget === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-card w-full max-w-[680px] max-h-full sm:max-h-[85dvh] rounded-[12px] flex flex-col shadow-lg overflow-hidden"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
          <Input
            value={title}
            onChange={e => handleChangeTitle(e.target.value)}
            placeholder="Note title — optional"
            className="border-0 shadow-none px-0 text-[16px] font-semibold focus-visible:ring-0 flex-1"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-accent transition-colors shrink-0 text-muted-foreground ml-4"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <RichTextEditor
            value={content}
            onChange={handleChangeContent}
            placeholder="Write your note..."
            className="border-0 rounded-none h-full"
            minHeight="100%"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border px-6 py-4 shrink-0 bg-muted/30">
          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && (
              <span className="text-xs text-muted-foreground">Saving...</span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                Saved <Check className="h-3 w-3" /> · {formatNoteCardTimestamp(lastSavedAt)}
              </span>
            )}
            {saveStatus === 'idle' && lastSavedAt && (
              <span className="text-xs text-muted-foreground">
                Last saved: {formatNoteCardTimestamp(lastSavedAt)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
            <span className="text-xs text-muted-foreground">
              Changes saved automatically
            </span>
            <Button variant="outline" size="sm" onClick={onClose} className="h-9 px-4">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
