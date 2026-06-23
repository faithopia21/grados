import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSelection } from '../../hooks/useSelection';
import { useParams, useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { InfoRow } from '../components/info-row';
import { PageSkeleton } from '../components/page-skeleton';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Checkbox } from '../components/ui/checkbox';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { ChecklistStatusSelect } from '../components/checklist-status-select';
import { StatusUpdateDialog } from '../components/status-update-dialog';
import { RichTextEditor } from '../components/rich-text-editor';
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
import { getShortTimezoneLabel } from '../../lib/timezone';
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
  X,
  ChevronRight,
  ChevronLeft,
  DollarSign,
} from 'lucide-react';
import { PageHeader } from '../components/page-header';

interface DbProgram {
  id: string;
  user_id: string;
  school_name: string;
  program_name: string;
  degree_type: string;
  country: string;
  deadline: string | null;
  deadline_time?: string | null;
  deadline_timezone?: string | null;
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

const BRIEFING_PLACEHOLDER = `Examples of helpful context...ure:
• How we know each other and for how long
• Key project or achievement to highlight
• Skills relevant to this specific program
• Why this program fits my goals`;

function getDaysRemaining(deadline: string | null | undefined): number | null {
  if (!deadline) return null;
  try {
    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) return null;
    return Math.ceil(
      (deadlineDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
  } catch {
    return null;
  }
}

function formatDeadline(deadline: string | null | undefined): string {
  if (!deadline) return 'No deadline set';
  try {
    const date = new Date(deadline);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return 'No deadline set';
  }
}

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

function getStatusDotColor(status: string | null): string {
  switch (status) {
    case 'In Progress': 
      return 'bg-indigo-500'
    case 'Ready to Submit': 
      return 'bg-indigo-500'
    case 'Submitted': 
      return 'bg-green-500'
    case 'Accepted': 
      return 'bg-green-500'
    case 'Rejected': 
      return 'bg-red-500'
    case 'Interview': 
      return 'bg-purple-500'
    case 'Waitlisted': 
      return 'bg-amber-500'
    default: 
      return 'bg-gray-400'
  }
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
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Persist active tab per program
  useEffect(() => {
    if (id) {
      const saved = localStorage.getItem(`workspace_tab_${id}`);
      if (saved) setActiveTab(saved);
    }
  }, [id]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (id) {
      localStorage.setItem(`workspace_tab_${id}`, tab);
    }
  };
  const [newItemLabel, setNewItemLabel] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [recommenderDeleteId, setRecommenderDeleteId] = useState<string | null>(null);
  const [briefingOverlayId, setBriefingOverlayId] = useState<string | null>(null);
  // Portal inline-editing state
  const [editingPortalUrl, setEditingPortalUrl] = useState(false);
  const [portalUrlDraft, setPortalUrlDraft] = useState('');
  const [portalSaving, setPortalSaving] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editingLinkDraft, setEditingLinkDraft] = useState({ label: '', url: '' });
  const [showAddLink, setShowAddLink] = useState(false);
  const [addLinkDraft, setAddLinkDraft] = useState({ label: '', url: '' });
  const briefingDebounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastSavedBriefingRef = useRef<Record<string, string>>({});
  const checklistCompleteToastShown = useRef(false);

  const checklistSelection = useSelection();
  const documentSelection = useSelection();
  const recommenderSelection = useSelection();
  const linkSelection = useSelection();

  const handleBulkDeleteChecklist = async () => {
    const ids = Array.from(checklistSelection.selectedIds);
    const { error } = await supabase.from('checklist_items').delete().in('id', ids);
    if (!error) {
      setChecklistItems(prev => prev.filter(i => !checklistSelection.selectedIds.has(i.id)));
      checklistSelection.clearSelection();
      toast.success(`${ids.length} requirements deleted`);
    } else {
      toast.error('Failed to delete requirements');
    }
  };

  const handleBulkUnlinkDocuments = async () => {
    const ids = Array.from(documentSelection.selectedIds);
    const { error } = await supabase.from('program_documents').delete().in('id', ids);
    if (!error) {
      setLinkedDocuments(prev => prev.filter(l => !documentSelection.selectedIds.has(l.linkId)));
      documentSelection.clearSelection();
      toast.success(`${ids.length} documents unlinked`);
    } else {
      toast.error('Failed to unlink documents');
    }
  };

  const handleBulkDeleteRecommenders = async () => {
    const ids = Array.from(recommenderSelection.selectedIds);
    const { error } = await supabase.from('recommenders').delete().in('id', ids);
    if (!error) {
      setRecommenders(prev => prev.filter(r => !recommenderSelection.selectedIds.has(r.id)));
      recommenderSelection.clearSelection();
      toast.success(`${ids.length} recommenders deleted`);
    } else {
      toast.error('Failed to delete recommenders');
    }
  };

  const handleBulkDeleteLinks = async () => {
    const ids = Array.from(linkSelection.selectedIds);
    const { error } = await supabase.from('portal_links').delete().in('id', ids);
    if (!error) {
      setPortalLinks(prev => prev.filter(l => !linkSelection.selectedIds.has(l.id)));
      linkSelection.clearSelection();
      toast.success(`${ids.length} links deleted`);
    } else {
      toast.error('Failed to delete links');
    }
  };

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
    if (!id) {
      setWorkspaceError('No program ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setWorkspaceError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('programs')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setWorkspaceError('Program not found');
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
    } catch (err: any) {
      console.error('Failed to load program:', err);
      if (!navigator.onLine) {
        setWorkspaceError('No internet connection. Please check your network.');
      } else {
        setWorkspaceError(err.message || 'Failed to load program details');
      }
    } finally {
      setLoading(false);
    }
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
    toast.success('Checklist updated');
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
    toast.success('Recommender added');
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
        status: 'Not Started',
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

    // Check what labels already exist for this program before inserting
    const { data: existing } = await supabase
      .from('checklist_items')
      .select('label')
      .eq('program_id', program.id);

    const existingLabels = new Set(
      (existing || []).map(item => item.label.toLowerCase().trim())
    );

    const defaultItems = [
      { label: 'Statement of Purpose', is_required: true, is_done: false, status: 'Not Started' },
      { label: 'CV/Resume', is_required: true, is_done: false, status: 'Not Started' },
      { label: 'Transcripts', is_required: true, is_done: false, status: 'Not Started' },
      { label: 'Letter of Recommendation 1', is_required: true, is_done: false, status: 'Not Started' },
      { label: 'Letter of Recommendation 2', is_required: true, is_done: false, status: 'Not Started' },
      { label: 'Letter of Recommendation 3', is_required: false, is_done: false, status: 'Not Started' },
      { label: 'Application Fee', is_required: true, is_done: false, status: 'Not Started' },
      { label: 'Personal Statement', is_required: false, is_done: false, status: 'Not Started' },
      { label: 'Research Proposal', is_required: false, is_done: false, status: 'Not Started' },
      { label: 'English Proficiency Test', is_required: false, is_done: false, status: 'Not Started' },
      { label: 'GRE Scores', is_required: false, is_done: false, status: 'Not Started' },
      { label: 'Writing Sample', is_required: false, is_done: false, status: 'Not Started' },
    ];

    // Only insert items whose label does not already exist for this program
    const itemsToInsert = defaultItems.filter(
      item => !existingLabels.has(item.label.toLowerCase().trim())
    );

    if (itemsToInsert.length === 0) {
      toast.info('Checklist already exists for this application');
      return;
    }

    const { data, error } = await supabase
      .from('checklist_items')
      .insert(
        itemsToInsert.map(item => ({
          ...item,
          program_id: program.id,
          created_at: new Date().toISOString(),
        }))
      )
      .select();

    if (error) {
      toast.error(error.message);
      return;
    }

    setChecklistItems(prev => [...prev, ...(data as ChecklistItem[])]);
    toast.success(`Added ${itemsToInsert.length} item${itemsToInsert.length === 1 ? '' : 's'} to your checklist`);
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    const { error } = await supabase.from('checklist_items').delete().eq('id', itemId);

    if (error) {
      toast.error(error.message);
      return;
    }

    setChecklistItems(prev => prev.filter(i => i.id !== itemId));
  };

  const handleStartEditPortalUrl = () => {
    setPortalUrlDraft(program?.portal_url ?? '');
    setEditingPortalUrl(true);
  };

  const handleSavePortalUrl = async () => {
    if (!program?.id) return;
    const url = portalUrlDraft.trim();
    setPortalSaving(true);
    const { error } = await supabase
      .from('programs')
      .update({ portal_url: url || null })
      .eq('id', program.id);
    if (error) {
      toast.error('Failed to save portal URL');
      setPortalSaving(false);
      return;
    }
    setProgram(prev => prev ? { ...prev, portal_url: url || null } : prev);
    setEditingPortalUrl(false);
    setPortalSaving(false);
    toast.success('Portal URL saved');
  };

  const handleSaveNewLink = async () => {
    if (!program || !addLinkDraft.label.trim() || !addLinkDraft.url.trim()) return;
    const { data, error } = await supabase
      .from('portal_links')
      .insert({ program_id: program.id, label: addLinkDraft.label.trim(), url: addLinkDraft.url.trim() })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setPortalLinks(prev => [...prev, data as PortalLink]);
    setAddLinkDraft({ label: '', url: '' });
    setShowAddLink(false);
    toast.success('Portal link saved');
  };

  const handleStartEditLink = (link: PortalLink) => {
    setEditingLinkId(link.id);
    setEditingLinkDraft({ label: link.label, url: link.url });
  };

  const handleSaveEditLink = async () => {
    if (!editingLinkId || !editingLinkDraft.label.trim() || !editingLinkDraft.url.trim()) return;
    const { error } = await supabase
      .from('portal_links')
      .update({ label: editingLinkDraft.label.trim(), url: editingLinkDraft.url.trim() })
      .eq('id', editingLinkId);
    if (error) { toast.error(error.message); return; }
    setPortalLinks(prev =>
      prev.map(l => l.id === editingLinkId ? { ...l, label: editingLinkDraft.label.trim(), url: editingLinkDraft.url.trim() } : l)
    );
    setEditingLinkId(null);
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

  const daysUntil = getDaysRemaining(program?.deadline);
  const checklistDone = checklistItems.filter(i => i.is_done).length;
  const checklistTotal = checklistItems.length;
  const checklistProgress = checklistTotal > 0 ? (checklistDone / checklistTotal) * 100 : 0;

  const nextSteps = useMemo(() => {
    return (checklistItems || [])
      .filter(item => !item.is_done)
      .slice(0, 5);
  }, [checklistItems]);
  const statusLabel = displayProgramStatus(program?.status || '');
  const statusKey = normalizeProgramStatus(program?.status || '');

  if (loading) return <PageSkeleton />;

  if (workspaceError || !program) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-lg font-medium">
          {workspaceError || 'Program not found'}
        </p>
        <button
          onClick={() => navigate('/applications')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
        >
          Back to Applications
        </button>
      </div>
    );
  }

  console.log('Rendering workspace for:', program.school_name, 'id:', id);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="md:hidden bg-background border-b border-border overflow-hidden">
        {/* Row 1 — navigation and actions */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          {/* Back button */}
          <button
            onClick={() => navigate('/applications')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={16} />
            <span className="text-xs">Back</span>
          </button>
          
          {/* Action icons — compact on mobile */}
          <div className="flex items-center gap-2">
            {/* Status badge — clickable, opens modal */}
            <button
              onClick={() => setIsStatusDialogOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border border-border hover:bg-accent"
            >
              <span className={`w-2 h-2 rounded-full ${getStatusDotColor(program.status)}`} />
              <span className="max-w-[80px] truncate">
                {program.status || 'Not Started'}
              </span>
            </button>
            
            {/* Portal icon button (only if URL exists) */}
            {program?.portal_url?.trim() && (
              <button
                onClick={() => window.open(program.portal_url!, '_blank')}
                className="p-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                title="Open Application Portal"
              >
                <ExternalLink size={16} />
              </button>
            )}
          </div>
        </div>
        
        {/* Row 2 — Compact Header Details */}
        <div className="px-4 pb-2">
          <h1 className="text-lg font-semibold text-foreground leading-tight mb-0.5">
            {program?.school_name}
          </h1>
          
          {/* All details on ONE line */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm text-muted-foreground">
              {program?.program_name}
            </span>
            {program?.country && (
              <>
                <span className="text-muted-foreground text-xs">•</span>
                <span className="text-xs text-muted-foreground">
                  {program.country}
                </span>
              </>
            )}
            {program?.degree_type && (
              <>
                <span className="text-muted-foreground text-xs">•</span>
                <span className="text-xs text-muted-foreground">
                  {program.degree_type}
                </span>
              </>
            )}
            {program?.funding_available && (
              <span 
                title="Funding available"
                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 cursor-default flex-shrink-0"
              >
                <DollarSign size={11} />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block">
        <PageHeader 
          title={
            <div className="flex items-center gap-2">
              <span>{program.school_name}</span>
              {program.funding_available && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0 text-xs">
                  Funding Available
                </Badge>
              )}
            </div>
          }
          subtitle={`${program.degree_type} in ${program.program_name}${program.country ? ` · ${program.country}` : ''}`}
          backTo="/applications"
        >
          <div className="flex items-center gap-2">
            <Badge
              variant={getStatusBadgeVariant(program.status)}
              className={cn(
                'cursor-pointer h-8 px-3 text-sm',
                getStatusBadgeClassName(program.status)
              )}
              onClick={() => setIsStatusDialogOpen(true)}
              title="Update status"
            >
              {statusLabel}
            </Badge>
            
            {program.portal_url?.trim() && (
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent border-[#4F46E5] text-[#4F46E5] hover:bg-indigo-50 dark:hover:bg-indigo-950/30 h-8"
                onClick={() => window.open(program.portal_url!, '_blank')}
              >
                Open Portal <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            )}
          </div>
        </PageHeader>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">

      <StatusUpdateDialog
        open={isStatusDialogOpen}
        onOpenChange={setIsStatusDialogOpen}
        currentStatus={program.status}
        onConfirm={handleStatusConfirm}
        confirming={statusSaving}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
          <TabsList className="flex w-full justify-start overflow-x-auto pb-1 scrollbar-hide bg-transparent gap-0 rounded-none border-b border-border">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Column 1 — Application Deadline */}
            <Card className="bg-white dark:bg-card border border-border/50 rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Application Deadline</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {program.deadline ? (
                  <>
                    <div className="text-xl">{formatDeadline(program.deadline)}</div>
                    {program.deadline_time && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        at {program.deadline_time}
                        {program.deadline_timezone && program.deadline_timezone !== 'UTC' && (
                          <span className="ml-1 text-xs">
                            ({getShortTimezoneLabel(program.deadline_timezone)})
                          </span>
                        )}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {daysUntil === null
                        ? 'No deadline'
                        : daysUntil >= 0
                        ? `${daysUntil} days remaining`
                        : 'Deadline passed'}
                    </p>
                    {/* Show original timezone if user enabled it in settings */}
                    {(() => {
                      const showOriginalTz = localStorage.getItem('grados_show_original_tz') === 'true';
                      return showOriginalTz && program.deadline_timezone ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          Original: {program.deadline_time} {program.deadline_timezone.split('/').pop()?.replace('_', ' ')}
                        </p>
                      ) : null;
                    })()}
                  </>
                ) : (
                  <>
                    <div className="text-xl">No deadline set</div>
                    <p className="text-xs text-muted-foreground mt-1">No deadline</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Column 2 — Next Steps */}
            <Card className="bg-white dark:bg-card border border-border/50 rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle>Next Steps</CardTitle>
                <CardDescription>Your top priorities</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {checklistItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                    <p className="text-sm text-muted-foreground">No checklist added yet</p>
                    <button
                      onClick={() => {
                        handleTabChange('requirements');
                        handleGenerateDefaultChecklist();
                      }}
                      className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Generate checklist &rarr;
                    </button>
                  </div>
                ) : nextSteps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-foreground">All requirements complete</p>
                      <p className="text-xs text-muted-foreground">Ready to review and submit</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {nextSteps.map((step, idx) => (
                      <div
                        key={step.id}
                        onClick={() => handleTabChange('requirements')}
                        className={`flex items-center gap-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors px-2 rounded-md ${
                          idx !== nextSteps.length - 1 ? 'border-b border-border/50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#4F46E5] text-white text-[10px] font-bold shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 text-[13px] text-foreground truncate">
                          {step.label}
                        </div>
                        {step.is_required && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            Required
                          </Badge>
                        )}
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Column 3 — Quick Info */}
            <Card className="bg-white dark:bg-card border border-border/50 rounded-xl">
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

              {checklistSelection.isSelectionMode && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={checklistSelection.selectedIds.size === checklistItems.length && checklistItems.length > 0}
                      onCheckedChange={() => checklistSelection.selectAll(checklistItems.map(i => i.id))}
                    />
                    <span className="text-sm font-medium">
                      {checklistSelection.selectedIds.size} selected
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={checklistSelection.clearSelection}>
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleBulkDeleteChecklist}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected
                    </Button>
                  </div>
                </div>
              )}

              {checklistItems.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <h3 className="text-lg mb-2 text-foreground font-medium">No requirements added yet</h3>
                  <div className="flex overflow-x-auto md:grid md:grid-cols-2 gap-3 pb-2 scrollbar-hide">
                    <Button onClick={handleGenerateDefaultChecklist} className="min-h-[44px]">
                      Generate default checklist
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddItem(true)} className="min-h-[44px]">
                      <Plus className="h-4 w-4 mr-2" />
                      Add item
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {checklistItems.map(item => {
                    const isSelected = checklistSelection.selectedIds.has(item.id);
                    return (
                    <div
                      key={item.id}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        checklistSelection.toggleSelection(item.id, true);
                      }}
                      onClick={(e) => {
                        if (checklistSelection.isSelectionMode) {
                          e.preventDefault();
                          e.stopPropagation();
                          checklistSelection.toggleSelection(item.id);
                        }
                      }}
                      className={`flex flex-col sm:flex-row sm:items-start gap-4 p-4 rounded-lg border transition-colors ${isSelected ? 'border-[#4F46E5] bg-[#4F46E5]/5' : 'border-border hover:bg-accent/30'} ${checklistSelection.isSelectionMode ? 'cursor-pointer' : ''}`}
                    >
                      <div className="mt-1" onClick={e => checklistSelection.isSelectionMode && e.stopPropagation()}>
                        <Checkbox
                          checked={item.is_done}
                          onCheckedChange={checked =>
                            handleToggleChecklistItem(item, checked === true)
                          }
                        />
                      </div>
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
                        <div onClick={e => checklistSelection.isSelectionMode && e.stopPropagation()}>
                          <ChecklistStatusSelect
                            value={item.status || 'Not Started'}
                            onChange={status => handleChecklistStatusChange(item, status)}
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); handleDeleteChecklistItem(item.id); }}
                        aria-label="Delete item"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  )})}
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
                {documentSelection.isSelectionMode && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={documentSelection.selectedIds.size === linkedDocuments.length && linkedDocuments.length > 0}
                        onCheckedChange={() => documentSelection.selectAll(linkedDocuments.map(l => l.linkId))}
                      />
                      <span className="text-sm font-medium">
                        {documentSelection.selectedIds.size} selected
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={documentSelection.clearSelection}>
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={handleBulkUnlinkDocuments}
                      >
                        <Unlink className="h-4 w-4 mr-2" />
                        Unlink Selected
                      </Button>
                    </div>
                  </div>
                )}

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
                    {linkedDocuments.map(({ linkId, document: doc }) => {
                      const isSelected = documentSelection.selectedIds.has(linkId);
                      return (
                      <div
                        key={linkId}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          documentSelection.toggleSelection(linkId, true);
                        }}
                        onClick={(e) => {
                          if (documentSelection.isSelectionMode) {
                            e.preventDefault();
                            e.stopPropagation();
                            documentSelection.toggleSelection(linkId);
                          }
                        }}
                        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border transition-colors ${isSelected ? 'border-[#4F46E5] bg-[#4F46E5]/5' : 'border-border hover:bg-accent/30'} ${documentSelection.isSelectionMode ? 'cursor-pointer' : ''}`}
                      >
                        <div className="min-w-0 pointer-events-none">
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
                            onClick={(e) => { e.stopPropagation(); handleDownloadLinkedDoc(doc); }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleUnlinkDocument(linkId); }}
                          >
                            <Unlink className="h-4 w-4 mr-2" />
                            Unlink
                          </Button>
                        </div>
                      </div>
                    )})}
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
            {recommenderSelection.isSelectionMode && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    checked={recommenderSelection.selectedIds.size === recommenders.length && recommenders.length > 0}
                    onCheckedChange={() => recommenderSelection.selectAll(recommenders.map(r => r.id))}
                  />
                  <span className="text-sm font-medium">
                    {recommenderSelection.selectedIds.size} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={recommenderSelection.clearSelection}>
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleBulkDeleteRecommenders}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                </div>
              </div>
            )}

            {recommenders.map(rec => {
              const isSelected = recommenderSelection.selectedIds.has(rec.id);
              return (
              <Card
                key={rec.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  recommenderSelection.toggleSelection(rec.id, true);
                }}
                onClick={(e) => {
                  if (recommenderSelection.isSelectionMode) {
                    e.preventDefault();
                    e.stopPropagation();
                    recommenderSelection.toggleSelection(rec.id);
                  }
                }}
                className={`relative border-l-[3px] ${getRecommenderBorderClass(rec.status)} transition-colors ${isSelected ? 'border-[#4F46E5] bg-[#4F46E5]/5' : 'hover:bg-accent/10'} ${recommenderSelection.isSelectionMode ? 'cursor-pointer' : ''}`}
              >
                <button
                  type="button"
                  className="absolute top-3 right-3 p-2 rounded-full text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center z-10"
                  onClick={(e) => { e.stopPropagation(); setRecommenderDeleteId(rec.id); }}
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
                        onClick={(e) => { e.stopPropagation(); handleDeleteRecommender(rec); }}
                      >
                        Yes
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); setRecommenderDeleteId(null); }}
                        className="min-h-[44px]"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                <div onClick={e => recommenderSelection.isSelectionMode && e.stopPropagation()}>
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
                  <div className="space-y-1">
                    <Label className="text-xs">Briefing note</Label>
                    {rec.briefing_note?.trim() ? (
                      <p className="text-[12px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {rec.briefing_note}
                      </p>
                    ) : (
                      <p className="text-[12px] text-muted-foreground italic">No briefing note yet</p>
                    )}
                    <button
                      type="button"
                      onClick={() => setBriefingOverlayId(rec.id)}
                      className="text-xs text-[#4F46E5] hover:underline mt-0.5 block"
                    >
                      View / Edit note →
                    </button>
                  </div>
                </CardContent>
                </div>
              </Card>
            )})}

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
            {/* Application Portal */}
            <Card>
              <CardHeader>
                <CardTitle>Application Portal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {editingPortalUrl ? (
                  <div className="space-y-3">
                    <Label className="text-sm">Portal URL</Label>
                    <Input
                      value={portalUrlDraft}
                      onChange={e => setPortalUrlDraft(e.target.value)}
                      placeholder="https://apply.university.edu"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSavePortalUrl} disabled={portalSaving}>
                        {portalSaving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingPortalUrl(false)} disabled={portalSaving}>Cancel</Button>
                    </div>
                  </div>
                ) : program.portal_url ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href={program.portal_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#4F46E5] hover:underline truncate flex-1 min-w-0"
                    >
                      {program.portal_url}
                    </a>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(program.portal_url!, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Open
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleStartEditPortalUrl}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">No portal URL saved yet.</p>
                    <Button variant="outline" size="sm" onClick={handleStartEditPortalUrl}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Add portal URL
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Saved Links */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Saved Links</CardTitle>
                  <CardDescription>Quick access to important pages</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {portalLinks.length === 0 && !showAddLink && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No additional links saved yet.
                  </p>
                )}

                {linkSelection.isSelectionMode && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={linkSelection.selectedIds.size === portalLinks.length && portalLinks.length > 0}
                        onCheckedChange={() => linkSelection.selectAll(portalLinks.map(l => l.id))}
                      />
                      <span className="text-sm font-medium">
                        {linkSelection.selectedIds.size} selected
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={linkSelection.clearSelection}>
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={handleBulkDeleteLinks}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Selected
                      </Button>
                    </div>
                  </div>
                )}

                {portalLinks.length > 0 && (
                  <div className="space-y-2">
                    {portalLinks.map(link => (
                      <div key={link.id}>
                        {editingLinkId === link.id ? (
                          <div className="space-y-2 p-3 rounded-lg border border-border">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <Input
                                value={editingLinkDraft.label}
                                onChange={e => setEditingLinkDraft(d => ({ ...d, label: e.target.value }))}
                                placeholder="Link label"
                              />
                              <Input
                                value={editingLinkDraft.url}
                                onChange={e => setEditingLinkDraft(d => ({ ...d, url: e.target.value }))}
                                placeholder="https://..."
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleSaveEditLink}>Save</Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingLinkId(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div 
                            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${linkSelection.selectedIds.has(link.id) ? 'border-[#4F46E5] bg-[#4F46E5]/5' : 'border-border hover:bg-accent/30'} ${linkSelection.isSelectionMode ? 'cursor-pointer' : ''}`}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              linkSelection.toggleSelection(link.id, true);
                            }}
                            onClick={(e) => {
                              if (linkSelection.isSelectionMode) {
                                e.preventDefault();
                                e.stopPropagation();
                                linkSelection.toggleSelection(link.id);
                              }
                            }}
                          >
                            <div className="flex items-center gap-3 min-w-0 pointer-events-none">
                              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{link.label}</p>
                                <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button variant="ghost" size="sm" onClick={e => e.stopPropagation()} asChild>
                                <a href={link.url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleStartEditLink(link); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleDeletePortalLink(link.id); }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new link inline form */}
                {showAddLink ? (
                  <div className="space-y-2 p-3 rounded-lg border border-dashed border-border">
                    <p className="text-xs font-medium text-muted-foreground">New Link</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        value={addLinkDraft.label}
                        onChange={e => setAddLinkDraft(d => ({ ...d, label: e.target.value }))}
                        placeholder="Link label (e.g. Department Page)"
                      />
                      <Input
                        value={addLinkDraft.url}
                        onChange={e => setAddLinkDraft(d => ({ ...d, url: e.target.value }))}
                        placeholder="https://cs.mit.edu"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveNewLink}>Save</Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setShowAddLink(false); setAddLinkDraft({ label: '', url: '' }); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddLink(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add link
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
          </TabsContent>
        </Tabs>
      {/* Briefing Note Overlay */}
      {briefingOverlayId && (() => {
        const rec = recommenders.find(r => r.id === briefingOverlayId);
        if (!rec) return null;
        return (
          <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 sm:p-6"
            onClick={() => setBriefingOverlayId(null)}
          >
            <div
              className="bg-card rounded-xl w-full max-w-[680px] max-h-full sm:max-h-[85dvh] flex flex-col shadow-xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
                <h3 className="font-semibold text-base">
                  {rec.name || 'Recommender'} — Briefing Note
                </h3>
                <button
                  type="button"
                  onClick={() => setBriefingOverlayId(null)}
                  className="p-2 rounded-lg hover:bg-accent transition-colors shrink-0"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <RichTextEditor
                  value={rec.briefing_note ?? ''}
                  onChange={value => handleBriefingChange(rec, value)}
                  placeholder={BRIEFING_PLACEHOLDER}
                  className="border-0 rounded-none h-full"
                  minHeight="100%"
                />
              </div>

              <div className="px-6 py-4 border-t border-border bg-muted/30 shrink-0 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Auto-saves as you type</p>
                <Button variant="outline" size="sm" onClick={() => setBriefingOverlayId(null)}>Close</Button>
              </div>
            </div>
          </div>
        );
      })()}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value || !value.trim()) return null;
  return (
    <div className="flex justify-between items-center py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value.trim()}</span>
    </div>
  );
}
