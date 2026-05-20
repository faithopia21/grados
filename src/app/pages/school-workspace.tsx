import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Checkbox } from '../components/ui/checkbox';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { DocumentStatusSelect } from '../components/document-status-select';
import { StatusUpdateDialog } from '../components/status-update-dialog';
import { supabase } from '../../lib/supabase';
import { formatDate, getDaysUntil } from '../../lib/utils';
import {
  displayProgramStatus,
  getStatusBadgeClassName,
  getStatusBadgeVariant,
} from '../../lib/program-status';
import { DocumentStatus } from '../../types';
import { formatDocumentStatus } from '../../lib/status-utils';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Globe,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';

interface DbProgram {
  id: string;
  user_id: string;
  school_name: string;
  program_name: string;
  degree_type: string;
  country: string;
  deadline: string;
  funding_available: boolean;
  portal_url: string | null;
  status: string;
  department?: string | null;
  tuition?: string | number | null;
  ranking?: string | number | null;
  application_round?: string | null;
}

interface ChecklistItem {
  id: string;
  program_id: string;
  label: string;
  is_done: boolean;
  is_required: boolean;
  status: string | null;
  due_date: string | null;
}

interface ProgramNote {
  id: string;
  program_id: string;
  content: string;
}

interface PortalLink {
  id: string;
  program_id: string;
  label: string;
  url: string;
}

const DEFAULT_CHECKLIST_LABELS = [
  'Statement of Purpose',
  'CV/Resume',
  'Transcripts',
  'Letter of Recommendation 1',
  'Letter of Recommendation 2',
  'Letter of Recommendation 3',
  'Application Fee',
];

function WorkspaceSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-6 w-96" />
      <Skeleton className="h-10 w-full max-w-xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

export function SchoolWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [program, setProgram] = useState<DbProgram | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [programNote, setProgramNote] = useState<ProgramNote | null>(null);
  const [portalLinks, setPortalLinks] = useState<PortalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [noteContent, setNoteContent] = useState('');
  const [noteSaveState, setNoteSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [newItemLabel, setNewItemLabel] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const noteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedNoteRef = useRef<string | null>(null);

  const fetchChecklist = useCallback(async (programId: string) => {
    const { data, error } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('program_id', programId)
      .order('id', { ascending: true });

    if (!error && data) {
      setChecklistItems(data as ChecklistItem[]);
    }
  }, []);

  const fetchNote = useCallback(async (programId: string) => {
    const { data, error } = await supabase
      .from('program_notes')
      .select('*')
      .eq('program_id', programId)
      .maybeSingle();

    if (!error && data) {
      const note = data as ProgramNote;
      const content = note.content ?? '';
      setProgramNote(note);
      setNoteContent(content);
      lastSavedNoteRef.current = content;
    } else {
      setProgramNote(null);
      setNoteContent('');
      lastSavedNoteRef.current = '';
    }
  }, []);

  const fetchPortalLinks = useCallback(async (programId: string) => {
    const { data, error } = await supabase
      .from('portal_links')
      .select('*')
      .eq('program_id', programId)
      .order('id', { ascending: true });

    if (!error && data) {
      setPortalLinks(data as PortalLink[]);
    }
  }, []);

  const fetchProgram = useCallback(async () => {
    if (!id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      setProgram(null);
      setLoading(false);
      return;
    }

    const prog = data as DbProgram;
    setProgram(prog);
    await Promise.all([
      fetchChecklist(prog.id),
      fetchNote(prog.id),
      fetchPortalLinks(prog.id),
    ]);
    setLoading(false);
  }, [id, fetchChecklist, fetchNote, fetchPortalLinks]);

  useEffect(() => {
    fetchProgram();
  }, [fetchProgram]);

  const saveNote = useCallback(
    async (content: string, programId: string, existingNote: ProgramNote | null) => {
      setNoteSaveState('saving');

      if (existingNote) {
        const { error } = await supabase
          .from('program_notes')
          .update({ content })
          .eq('id', existingNote.id);

        if (error) {
          setNoteSaveState('idle');
          toast.error(error.message);
          return;
        }
        setProgramNote({ ...existingNote, content });
      } else {
        const { data, error } = await supabase
          .from('program_notes')
          .insert({ program_id: programId, content })
          .select()
          .single();

        if (error) {
          setNoteSaveState('idle');
          toast.error(error.message);
          return;
        }
        setProgramNote(data as ProgramNote);
      }

      lastSavedNoteRef.current = content;
      setNoteSaveState('saved');
      setTimeout(() => setNoteSaveState('idle'), 2000);
    },
    []
  );

  useEffect(() => {
    if (!program || loading) return;
    if (noteContent === lastSavedNoteRef.current) return;

    if (noteDebounceRef.current) {
      clearTimeout(noteDebounceRef.current);
    }

    noteDebounceRef.current = setTimeout(() => {
      saveNote(noteContent, program.id, programNote);
    }, 1000);

    return () => {
      if (noteDebounceRef.current) {
        clearTimeout(noteDebounceRef.current);
      }
    };
  }, [noteContent, program, programNote, loading, saveNote]);

  const handleStatusConfirm = async (status: string) => {
    if (!program) return;

    setStatusSaving(true);
    const { error } = await supabase
      .from('programs')
      .update({ status })
      .eq('id', program.id);

    setStatusSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setProgram(prev => (prev ? { ...prev, status } : prev));
    toast.success(`Status updated to ${status}`);
  };

  const handleToggleChecklistItem = async (item: ChecklistItem, checked: boolean) => {
    const { error } = await supabase
      .from('checklist_items')
      .update({ is_done: checked })
      .eq('id', item.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setChecklistItems(prev =>
      prev.map(i => (i.id === item.id ? { ...i, is_done: checked } : i))
    );
  };

  const handleChecklistStatusChange = async (item: ChecklistItem, status: DocumentStatus) => {
    const { error } = await supabase
      .from('checklist_items')
      .update({ status })
      .eq('id', item.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setChecklistItems(prev =>
      prev.map(i => (i.id === item.id ? { ...i, status } : i))
    );
    toast.success(`Status updated to ${formatDocumentStatus(status)}`);
  };

  const handleAddChecklistItem = async () => {
    if (!program || !newItemLabel.trim()) return;

    const { data, error } = await supabase
      .from('checklist_items')
      .insert({
        program_id: program.id,
        label: newItemLabel.trim(),
        is_done: false,
        is_required: false,
        status: 'not_started',
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    setChecklistItems(prev => [...prev, data as ChecklistItem]);
    setNewItemLabel('');
    setShowAddItem(false);
    toast.success('Item added');
  };

  const handleGenerateDefaultChecklist = async () => {
    if (!program) return;

    const rows = DEFAULT_CHECKLIST_LABELS.map(label => ({
      program_id: program.id,
      label,
      is_required: true,
      is_done: false,
      status: 'not_started',
    }));

    const { data, error } = await supabase.from('checklist_items').insert(rows).select();

    if (error) {
      toast.error(error.message);
      return;
    }

    setChecklistItems(data as ChecklistItem[]);
    toast.success('Default checklist created');
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    const { error } = await supabase.from('checklist_items').delete().eq('id', itemId);

    if (error) {
      toast.error(error.message);
      return;
    }

    setChecklistItems(prev => prev.filter(i => i.id !== itemId));
  };

  const handleEditPortalUrl = async () => {
    if (!program) return;
    const url = window.prompt('Application portal URL', program.portal_url ?? '');
    if (url === null) return;

    const { error } = await supabase
      .from('programs')
      .update({ portal_url: url.trim() || null })
      .eq('id', program.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setProgram(prev => (prev ? { ...prev, portal_url: url.trim() || null } : prev));
    toast.success('Portal URL updated');
  };

  const handleAddPortalLink = async () => {
    if (!program) return;
    const label = window.prompt('Link label (e.g. Department Page)');
    if (!label?.trim()) return;
    const url = window.prompt('URL');
    if (!url?.trim()) return;

    const { data, error } = await supabase
      .from('portal_links')
      .insert({
        program_id: program.id,
        label: label.trim(),
        url: url.trim(),
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    setPortalLinks(prev => [...prev, data as PortalLink]);
    toast.success('Link added');
  };

  const handleEditPortalLink = async (link: PortalLink) => {
    const label = window.prompt('Link label', link.label);
    if (!label?.trim()) return;
    const url = window.prompt('URL', link.url);
    if (!url?.trim()) return;

    const { error } = await supabase
      .from('portal_links')
      .update({ label: label.trim(), url: url.trim() })
      .eq('id', link.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setPortalLinks(prev =>
      prev.map(l => (l.id === link.id ? { ...l, label: label.trim(), url: url.trim() } : l))
    );
  };

  const handleDeletePortalLink = async (linkId: string) => {
    const { error } = await supabase.from('portal_links').delete().eq('id', linkId);

    if (error) {
      toast.error(error.message);
      return;
    }

    setPortalLinks(prev => prev.filter(l => l.id !== linkId));
  };

  if (loading) {
    return <WorkspaceSkeleton />;
  }

  if (!program) {
    return (
      <div className="p-8 space-y-4">
        <p>Application not found</p>
        <Button onClick={() => navigate('/applications')}>Back to Applications</Button>
      </div>
    );
  }

  const daysUntil = getDaysUntil(program.deadline);
  const checklistDone = checklistItems.filter(i => i.is_done).length;
  const checklistTotal = checklistItems.length;
  const checklistProgress = checklistTotal > 0 ? (checklistDone / checklistTotal) * 100 : 0;
  const statusLabel = displayProgramStatus(program.status);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/applications')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl md:text-2xl">{program.school_name}</h1>
            <Badge
              variant={getStatusBadgeVariant(program.status)}
              className={getStatusBadgeClassName(program.status)}
            >
              {statusLabel}
            </Badge>
            {program.funding_available && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0">
                Funding Available
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {program.degree_type} in {program.program_name}
          </p>
          {program.country && (
            <p className="text-sm text-muted-foreground mt-0.5">{program.country}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setIsStatusDialogOpen(true)}>
            Mark as Submitted
          </Button>
          <Button variant="outline" onClick={() => setIsStatusDialogOpen(true)}>
            Update Status
          </Button>
        </div>
      </div>

      <StatusUpdateDialog
        open={isStatusDialogOpen}
        onOpenChange={setIsStatusDialogOpen}
        currentStatus={program.status}
        onConfirm={handleStatusConfirm}
        confirming={statusSaving}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="w-max md:w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="requirements">Requirements Checklist</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="portal">Portal Access</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Application Deadline</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl">{formatDate(program.deadline)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {daysUntil >= 0 ? `${daysUntil} days remaining` : 'Deadline passed'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Checklist Progress</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl">
                  {checklistDone}/{checklistTotal}
                </div>
                <Progress value={checklistProgress} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Degree" value={program.degree_type} />
                <InfoRow label="Department" value={program.department} />
                <InfoRow label="Country" value={program.country} />
                <InfoRow
                  label="Tuition"
                  value={
                    program.tuition != null && program.tuition !== ''
                      ? String(program.tuition)
                      : null
                  }
                />
                <InfoRow
                  label="Ranking"
                  value={
                    program.ranking != null && program.ranking !== ''
                      ? String(program.ranking)
                      : null
                  }
                />
                <InfoRow label="Application round" value={program.application_round} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Application Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Badge
                  variant={getStatusBadgeVariant(program.status)}
                  className={`text-base px-3 py-1 ${getStatusBadgeClassName(program.status)}`}
                >
                  {statusLabel}
                </Badge>
                <Button variant="outline" onClick={() => setIsStatusDialogOpen(true)}>
                  Update Status
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="requirements">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle>Requirements Checklist</CardTitle>
                  <CardDescription>Track all requirements for this application</CardDescription>
                </div>
                <span className="text-sm text-muted-foreground">
                  {checklistDone}/{checklistTotal} complete
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Progress value={checklistProgress} className="h-2" />
              </div>

              {checklistItems.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <p className="text-muted-foreground">No checklist items yet</p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <Button onClick={handleGenerateDefaultChecklist}>
                      Generate default checklist
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddItem(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add item
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {checklistItems.map(item => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 rounded-lg border border-border"
                    >
                      <Checkbox
                        checked={item.is_done}
                        onCheckedChange={checked =>
                          handleToggleChecklistItem(item, checked === true)
                        }
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-sm ${item.is_done ? 'line-through text-muted-foreground' : ''}`}
                          >
                            {item.label}
                          </span>
                          {item.is_required && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                        {item.due_date && (
                          <p className="text-xs text-muted-foreground">
                            Due {formatDate(item.due_date)}
                          </p>
                        )}
                        <DocumentStatusSelect
                          value={(item.status as DocumentStatus) || 'not_started'}
                          onChange={status => handleChecklistStatusChange(item, status)}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteChecklistItem(item.id)}
                        aria-label="Delete item"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {checklistItems.length > 0 && (
                <div className="space-y-3 pt-2">
                  {showAddItem ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Item label"
                        value={newItemLabel}
                        onChange={e => setNewItemLabel(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddChecklistItem()}
                      />
                      <Button onClick={handleAddChecklistItem}>Add</Button>
                      <Button variant="outline" onClick={() => setShowAddItem(false)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={() => setShowAddItem(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add item
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Program Notes</CardTitle>
                  <CardDescription>
                    Auto-saves as you type
                  </CardDescription>
                </div>
                <span className="text-xs text-muted-foreground">
                  {noteSaveState === 'saving' && 'Saving...'}
                  {noteSaveState === 'saved' && 'Saved ✓'}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Write notes about this application..."
                value={noteContent}
                onChange={e => {
                  setNoteSaveState('idle');
                  setNoteContent(e.target.value);
                }}
                rows={12}
                className="resize-none min-h-[200px]"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portal">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Application Portal</CardTitle>
              </CardHeader>
              <CardContent>
                {program.portal_url ? (
                  <Button asChild size="lg" className="w-full h-auto py-4">
                    <a href={program.portal_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-5 w-5 mr-3" />
                      Open Application Portal
                    </a>
                  </Button>
                ) : (
                  <div className="text-center py-6 space-y-3">
                    <p className="text-sm text-muted-foreground">No portal URL saved</p>
                    <Button variant="outline" onClick={handleEditPortalUrl}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Add portal URL
                    </Button>
                  </div>
                )}
                {program.portal_url && (
                  <Button variant="ghost" size="sm" className="mt-2" onClick={handleEditPortalUrl}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit portal URL
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Saved Links</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleAddPortalLink}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add link
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {portalLinks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No additional links saved yet.
                  </p>
                ) : (
                  portalLinks.map(link => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{link.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" asChild>
                          <a href={link.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEditPortalLink(link)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePortalLink(link.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-right">{value?.trim() ? value : '—'}</span>
    </div>
  );
}
