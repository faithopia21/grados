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
import { ChecklistStatusSelect } from '../components/checklist-status-select';
import { StatusUpdateDialog } from '../components/status-update-dialog';
import { UploadDocumentFlow } from '../components/upload-document-flow';
import { WorkspaceProgramNotes } from '../components/workspace-program-notes';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  type DbDocument,
  formatDocumentDate,
  getDocTypeBadgeClass,
  getDocTypeLabel,
} from '../../lib/documents';
import { supabase } from '../../lib/supabase';
import { cn, formatDate, getDaysUntil } from '../../lib/utils';
import { resolveChecklistUpdate } from '../../lib/checklist-status';
import {
  displayProgramStatus,
  getStatusBadgeClassName,
  getStatusBadgeVariant,
  normalizeProgramStatus,
} from '../../lib/program-status';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../components/ui/tooltip';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  Pencil,
  ExternalLink,
  CheckCircle2,
  Globe,
  Plus,
  Trash2,
  FileText,
  Upload,
  Link2,
  Unlink,
  Download,
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

interface Recommender {
  id: string;
  program_id: string;
  name: string | null;
  title: string | null;
  email: string | null;
  status: string;
  briefing_note: string | null;
}

const RECOMMENDER_STATUSES = ['Not Asked', 'Asked', 'Confirmed', 'Submitted'] as const;

const BRIEFING_PLACEHOLDER = `Suggested structure:
• How we know each other and for how long
• Key project or achievement to highlight
• Skills relevant to this specific program
• Why this program fits my goals`;

function getRecommenderBorderClass(status: string): string {
  const n = status?.toLowerCase();
  if (n === 'asked') return 'border-l-amber-500';
  if (n === 'confirmed') return 'border-l-[#4F46E5]';
  if (n === 'submitted') return 'border-l-green-500';
  return 'border-l-gray-400';
}

function isRecommenderComplete(status: string): boolean {
  const n = status?.toLowerCase();
  return n === 'confirmed' || n === 'submitted';
}

interface PortalLink {
  id: string;
  program_id: string;
  label: string;
  url: string;
}

interface LinkedDocument {
  linkId: string;
  document: DbDocument;
}

const PROGRAM_DOCUMENTS_SELECT = `
  id,
  document_id,
  documents (
    id,
    name,
    doc_type,
    file_url,
    storage_path,
    version,
    file_size,
    created_at
  )
`;

type ProgramDocumentRow = {
  id: string;
  document_id: string;
  documents:
    | {
        id: string;
        name: string;
        doc_type: string;
        file_url: string;
        storage_path?: string | null;
        version: number;
        file_size: string;
        created_at: string;
      }
    | {
        id: string;
        name: string;
        doc_type: string;
        file_url: string;
        storage_path?: string | null;
        version: number;
        file_size: string;
        created_at: string;
      }[]
    | null;
};

function mapProgramDocumentLinks(rows: ProgramDocumentRow[]): LinkedDocument[] {
  return rows
    .map(row => {
      const nested = row.documents;
      const doc = Array.isArray(nested) ? nested[0] : nested;
      if (!doc) return null;
      return {
        linkId: row.id,
        document: {
          id: doc.id,
          user_id: '',
          name: doc.name,
          doc_type: doc.doc_type,
          file_url: doc.file_url,
          file_size: doc.file_size,
          version: doc.version,
          created_at: doc.created_at,
          storage_path: doc.storage_path ?? null,
        },
      };
    })
    .filter((link): link is LinkedDocument => link !== null);
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

function BriefingNoteTextarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
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
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
      }}
    />
  );
}

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
  const [portalLinks, setPortalLinks] = useState<PortalLink[]>([]);
  const [recommenders, setRecommenders] = useState<Recommender[]>([]);
  const [linkedDocuments, setLinkedDocuments] = useState<LinkedDocument[]>([]);
  const [libraryDocuments, setLibraryDocuments] = useState<DbDocument[]>([]);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [newItemLabel, setNewItemLabel] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [recommenderDeleteId, setRecommenderDeleteId] = useState<string | null>(null);
  const briefingDebounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastSavedBriefingRef = useRef<Record<string, string>>({});
  const checklistCompleteToastShown = useRef(false);

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

  const fetchLinkedDocuments = useCallback(async (programId: string) => {
    const { data: linkedDocs, error } = await supabase
      .from('program_documents')
      .select(PROGRAM_DOCUMENTS_SELECT)
      .eq('program_id', programId);

    if (!error && linkedDocs) {
      setLinkedDocuments(mapProgramDocumentLinks(linkedDocs as ProgramDocumentRow[]));
    } else {
      setLinkedDocuments([]);
    }
  }, []);

  const fetchLibraryDocuments = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLibraryDocuments([]);
      return;
    }

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLibraryDocuments(data as DbDocument[]);
    }
  }, []);

  const fetchRecommenders = useCallback(async (programId: string) => {
    const { data, error } = await supabase
      .from('recommenders')
      .select('*')
      .eq('program_id', programId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const rows = data as Recommender[];
      setRecommenders(rows);
      rows.forEach(r => {
        lastSavedBriefingRef.current[r.id] = r.briefing_note ?? '';
      });
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
      fetchPortalLinks(prog.id),
      fetchRecommenders(prog.id),
      fetchLinkedDocuments(prog.id),
    ]);
    setLoading(false);
  }, [id, fetchChecklist, fetchPortalLinks, fetchRecommenders, fetchLinkedDocuments]);

  useEffect(() => {
    fetchProgram();
  }, [fetchProgram]);

  useEffect(() => {
    if (!checklistItems.length) {
      checklistCompleteToastShown.current = false;
      return;
    }
    const required = checklistItems.filter(i => i.is_required);
    const allDone =
      required.length > 0 && required.every(i => i.is_done || i.status === 'done');
    if (allDone && !checklistCompleteToastShown.current) {
      toast.success('All requirements complete — ready to submit!');
      checklistCompleteToastShown.current = true;
    }
    if (!allDone) {
      checklistCompleteToastShown.current = false;
    }
  }, [checklistItems]);

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
    toast.success(`Status updated to ${displayProgramStatus(status)}`);
  };

  const handleMarkAsSubmitted = async () => {
    if (!program) return;

    setStatusSaving(true);
    const { error } = await supabase
      .from('programs')
      .update({ status: 'Submitted' })
      .eq('id', program.id);

    setStatusSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setProgram(prev => (prev ? { ...prev, status: 'Submitted' } : prev));
    toast.success('Marked as submitted');
  };

  const updateChecklistItem = async (
    item: ChecklistItem,
    change: { is_done?: boolean; status?: string }
  ) => {
    const { is_done, status } = resolveChecklistUpdate(
      { is_done: item.is_done, status: item.status },
      change
    );

    const { error } = await supabase
      .from('checklist_items')
      .update({ is_done, status })
      .eq('id', item.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setChecklistItems(prev =>
      prev.map(i => (i.id === item.id ? { ...i, is_done, status } : i))
    );
  };

  const handleToggleChecklistItem = (item: ChecklistItem, checked: boolean) => {
    updateChecklistItem(item, { is_done: checked });
  };

  const handleChecklistStatusChange = (item: ChecklistItem, status: string) => {
    updateChecklistItem(item, { status });
  };

  const updateRecommender = async (
    recommenderId: string,
    updates: Partial<Pick<Recommender, 'name' | 'title' | 'email' | 'status' | 'briefing_note'>>
  ) => {
    const { error } = await supabase
      .from('recommenders')
      .update(updates)
      .eq('id', recommenderId);

    if (error) {
      toast.error(error.message);
      return false;
    }
    return true;
  };

  const handleRecommenderFieldBlur = async (
    rec: Recommender,
    field: 'name' | 'title' | 'email',
    value: string
  ) => {
    const updates = { [field]: value.trim() || null };
    const ok = await updateRecommender(rec.id, updates);
    if (ok) {
      setRecommenders(prev =>
        prev.map(r => (r.id === rec.id ? { ...r, ...updates } : r))
      );
    }
  };

  const handleRecommenderStatusChange = async (rec: Recommender, status: string) => {
    const ok = await updateRecommender(rec.id, { status });
    if (ok) {
      setRecommenders(prev => prev.map(r => (r.id === rec.id ? { ...r, status } : r)));
    }
  };

  const saveRecommenderBriefing = async (rec: Recommender, briefing_note: string) => {
    const ok = await updateRecommender(rec.id, { briefing_note });
    if (ok) {
      lastSavedBriefingRef.current[rec.id] = briefing_note;
    }
  };

  const handleBriefingChange = (rec: Recommender, value: string) => {
    setRecommenders(prev =>
      prev.map(r => (r.id === rec.id ? { ...r, briefing_note: value } : r))
    );

    if (briefingDebounceRefs.current[rec.id]) {
      clearTimeout(briefingDebounceRefs.current[rec.id]);
    }

    briefingDebounceRefs.current[rec.id] = setTimeout(() => {
      if (value === lastSavedBriefingRef.current[rec.id]) return;
      saveRecommenderBriefing(rec, value);
    }, 1000);
  };

  const handleAddRecommender = async () => {
    if (!program) return;
    if (recommenders.length >= 5) {
      toast.error('Maximum 5 recommenders');
      return;
    }

    const { data, error } = await supabase
      .from('recommenders')
      .insert({
        program_id: program.id,
        name: '',
        title: '',
        email: '',
        status: 'Not Asked',
        briefing_note: '',
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    const row = data as Recommender;
    lastSavedBriefingRef.current[row.id] = '';
    setRecommenders(prev => [...prev, row]);
  };

  const handleDeleteRecommender = async (rec: Recommender) => {
    const { error } = await supabase.from('recommenders').delete().eq('id', rec.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setRecommenders(prev => prev.filter(r => r.id !== rec.id));
    delete lastSavedBriefingRef.current[rec.id];
    setRecommenderDeleteId(null);
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

  const handleOpenLibrary = async () => {
    await fetchLibraryDocuments();
    setIsLibraryOpen(true);
  };

  const handleLinkDocument = async (documentId: string) => {
    if (!program) return;

    const alreadyLinked = linkedDocuments.some(l => l.document.id === documentId);
    if (alreadyLinked) {
      toast.error('Document is already linked');
      return;
    }

    const { data, error } = await supabase
      .from('program_documents')
      .insert({
        program_id: program.id,
        document_id: documentId,
      })
      .select(PROGRAM_DOCUMENTS_SELECT)
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    const [link] = mapProgramDocumentLinks([data as ProgramDocumentRow]);
    if (link) {
      setLinkedDocuments(prev => [...prev, link]);
    }
    toast.success('Document linked');
  };

  const handleUnlinkDocument = async (linkId: string) => {
    const { error } = await supabase.from('program_documents').delete().eq('id', linkId);

    if (error) {
      toast.error(error.message);
      return;
    }

    setLinkedDocuments(prev => prev.filter(l => l.linkId !== linkId));
    toast.success('Document unlinked');
  };

  const handleDownloadLinkedDoc = async (doc: DbDocument) => {
    const storagePath = doc.storage_path?.trim();
    if (storagePath) {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(storagePath, 3600);

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
        return;
      }

      if (error) {
        toast.error(error.message);
        return;
      }
    }

    if (doc.file_url?.trim()) {
      window.open(doc.file_url, '_blank');
      return;
    }

    toast.error('Could not download file');
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
  const statusKey = normalizeProgramStatus(program.status);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/applications')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl md:text-2xl">{program.school_name}</h1>
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
          {program.portal_url?.trim() && (
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent border-[#4F46E5] text-[#4F46E5] hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
              onClick={() => window.open(program.portal_url!, '_blank')}
            >
              ↗ Open Application Portal
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setIsStatusDialogOpen(true)}
                aria-label="Update status"
              >
                <Badge
                  variant={getStatusBadgeVariant(program.status)}
                  className={cn(
                    'cursor-pointer',
                    getStatusBadgeClassName(program.status)
                  )}
                >
                  {statusLabel}
                </Badge>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Update status</TooltipContent>
          </Tooltip>
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
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
          <TabsList className="w-max min-w-full h-auto p-0 bg-transparent gap-0 rounded-none border-b border-border">
            <TabsTrigger
              value="overview"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#4F46E5] data-[state=active]:text-[#4F46E5] data-[state=active]:shadow-none px-4 py-2.5"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="requirements"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#4F46E5] data-[state=active]:text-[#4F46E5] data-[state=active]:shadow-none px-4 py-2.5"
            >
              Requirements
            </TabsTrigger>
            <TabsTrigger
              value="recommendations"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#4F46E5] data-[state=active]:text-[#4F46E5] data-[state=active]:shadow-none px-4 py-2.5"
            >
              Recommendations
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#4F46E5] data-[state=active]:text-[#4F46E5] data-[state=active]:shadow-none px-4 py-2.5"
            >
              Documents
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#4F46E5] data-[state=active]:text-[#4F46E5] data-[state=active]:shadow-none px-4 py-2.5"
            >
              Notes
            </TabsTrigger>
            <TabsTrigger
              value="portal"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#4F46E5] data-[state=active]:text-[#4F46E5] data-[state=active]:shadow-none px-4 py-2.5"
            >
              Portal Access
            </TabsTrigger>
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
                {statusKey !== 'accepted' && statusKey !== 'rejected' && (
                  <>
                    {statusKey === 'submitted' ? (
                      <Button
                        variant="outline"
                        className="w-full border-green-600 text-green-700 dark:text-green-400"
                        disabled
                      >
                        Submitted ✓
                      </Button>
                    ) : (
                      <Button
                        className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white"
                        onClick={handleMarkAsSubmitted}
                        disabled={statusSaving}
                      >
                        Mark as Submitted
                      </Button>
                    )}
                  </>
                )}
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
                    <Button onClick={handleGenerateDefaultChecklist} className="min-h-[44px]">
                      Generate default checklist
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddItem(true)} className="min-h-[44px]">
                      <Plus className="h-4 w-4 mr-2" />
                      Add manually
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
                        <ChecklistStatusSelect
                          value={item.status || 'not_started'}
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

        <TabsContent value="documents">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>Application Documents</CardTitle>
                    <CardDescription>Files linked to this program</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={handleOpenLibrary}>
                      Browse Document Library
                    </Button>
                    <Button size="sm" onClick={() => setIsUploadDocOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload New
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {linkedDocuments.length === 0 ? (
                  <div className="py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground mb-4">
                      No documents linked to this program yet.
                    </p>
                    <Button variant="outline" onClick={handleOpenLibrary}>
                      <Link2 className="h-4 w-4 mr-2" />
                      Browse Document Library
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {linkedDocuments.map(({ linkId, document: doc }) => (
                      <div
                        key={linkId}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border border-border"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Badge
                              className={cn(
                                'text-xs border-0',
                                getDocTypeBadgeClass(doc.doc_type)
                              )}
                            >
                              {getDocTypeLabel(doc.doc_type)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">v{doc.version}</span>
                          </div>
                          <p className="text-sm font-medium truncate">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDocumentDate(doc.created_at)} · {doc.file_size}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadLinkedDoc(doc)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnlinkDocument(linkId)}
                          >
                            <Unlink className="h-4 w-4 mr-2" />
                            Unlink
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Document Library</DialogTitle>
                <DialogDescription>
                  Link an existing document to this application
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                {libraryDocuments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No documents in your library yet. Upload from the Documents hub first.
                  </p>
                ) : (
                  libraryDocuments.map(doc => {
                    const isLinked = linkedDocuments.some(l => l.document.id === doc.id);
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {getDocTypeLabel(doc.doc_type)} · v{doc.version}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={isLinked ? 'outline' : 'default'}
                          disabled={isLinked}
                          onClick={() => handleLinkDocument(doc.id)}
                          style={!isLinked ? { backgroundColor: '#4F46E5' } : undefined}
                          className={!isLinked ? 'text-white hover:opacity-90' : undefined}
                        >
                          {isLinked ? 'Linked' : 'Link to this application'}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </DialogContent>
          </Dialog>

          {program && (
            <UploadDocumentFlow
              open={isUploadDocOpen}
              onOpenChange={setIsUploadDocOpen}
              linkToProgramId={program.id}
              onSuccess={() => {
                fetchLinkedDocuments(program.id);
                fetchLibraryDocuments();
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="notes">
          {program && <WorkspaceProgramNotes programId={program.id} />}
        </TabsContent>

        <TabsContent value="recommendations">
          <div className="space-y-4">
            {recommenders.map(rec => (
              <Card
                key={rec.id}
                className={`relative border-l-[3px] ${getRecommenderBorderClass(rec.status)}`}
              >
                <button
                  type="button"
                  className="absolute top-3 right-3 p-2 rounded-full text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  onClick={() => setRecommenderDeleteId(rec.id)}
                  aria-label="Remove recommender"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                {recommenderDeleteId === rec.id && (
                  <div className="px-6 pt-4 pb-0 border-b border-border">
                    <p className="text-sm mb-2 pr-12">Remove this recommender?</p>
                    <div className="flex gap-2 pb-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[#DC2626] border-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/30 min-h-[44px]"
                        onClick={() => handleDeleteRecommender(rec)}
                      >
                        Yes
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRecommenderDeleteId(null)}
                        className="min-h-[44px]"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                <CardContent className="pt-6 space-y-4 pr-12">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Name</Label>
                      <Input
                        defaultValue={rec.name ?? ''}
                        placeholder="Recommender name"
                        onBlur={e => handleRecommenderFieldBlur(rec, 'name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Title / Role</Label>
                      <Input
                        defaultValue={rec.title ?? ''}
                        placeholder="Professor, Manager..."
                        onBlur={e => handleRecommenderFieldBlur(rec, 'title', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email</Label>
                      <Input
                        type="email"
                        defaultValue={rec.email ?? ''}
                        placeholder="email@university.edu"
                        onBlur={e => handleRecommenderFieldBlur(rec, 'email', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Label className="text-xs shrink-0">Status</Label>
                    <select
                      value={rec.status || 'Not Asked'}
                      onChange={e => handleRecommenderStatusChange(rec, e.target.value)}
                      className="px-3 py-2 text-sm border border-border rounded-md bg-background"
                    >
                      {RECOMMENDER_STATUSES.map(s => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Briefing note</Label>
                    <BriefingNoteTextarea
                      value={rec.briefing_note ?? ''}
                      onChange={value => handleBriefingChange(rec, value)}
                      placeholder={BRIEFING_PLACEHOLDER}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(rec.briefing_note ?? '');
                        toast.success('Briefing note copied');
                      }}
                    >
                      Copy note
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button
              variant="outline"
              className="w-full"
              onClick={handleAddRecommender}
              disabled={recommenders.length >= 5}
              title={recommenders.length >= 5 ? 'Maximum 5 recommenders' : undefined}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add recommender
            </Button>
          </div>
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
                    <p className="text-sm text-muted-foreground">
                      No portal URL saved — add one when editing this school
                    </p>
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
