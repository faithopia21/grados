import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';

import { ApplicationCardSkeleton } from '../components/application-card-skeleton';
import { PageSkeleton } from '../components/page-skeleton';
import { AddSchoolDialog, SchoolFormData } from '../components/add-school-dialog';
import { Checkbox } from '../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';

import { getDaysUntil, formatDate, safeGetTime } from '../../lib/utils';
import { Plus, ArrowRight, Search, Trash2, AlertTriangle, ArrowUp, ArrowDown, X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { FABButton } from '../components/layout/fab-button';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { displayProgramStatus } from '../../lib/program-status';
import { PageHeader } from '../components/page-header';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { OfflinePage } from '../components/offline-page';
import { usePersistedState } from '@/hooks/usePersistedState';

interface DbProgram {
  id: string;
  user_id: string;
  school_name: string;
  program_name: string;
  degree_type: string;
  country: string;
  deadline: string | null;
  funding_available: boolean;
  portal_url: string | null;
  status: string;
  created_at: string;
}

interface ProgramWithProgress extends DbProgram {
  checklistDone: number;
  checklistTotal: number;
}

type StatusFilter =
  | 'all'
  | 'Not Started'
  | 'In Progress'
  | 'Ready to Submit'
  | 'submitted'
  | 'accepted'
  | 'rejected';

type SortOption = 'deadline' | 'recent' | 'progress-high' | 'progress-low' | 'name';

function normalizeStatus(status: string): string {
  return status?.toLowerCase().replace(/\s+/g, '_') ?? 'Not Started';
}

function statusMatchesFilter(programStatus: string, filter: StatusFilter): boolean {
  if (filter === 'all') return true;
  return normalizeStatus(programStatus) === filter;
}

function programToFormData(program: DbProgram): SchoolFormData {
  const degree = ['MSc', 'PhD', 'MA', 'MBA'].includes(program.degree_type)
    ? (program.degree_type as SchoolFormData['degree'])
    : 'MSc';

  return {
    universityName: program.school_name || '',
    programName: program.program_name || '',
    degree,
    country: program.country || '',
    department: program.department || '',
    portalUrl: program.portal_url || '',
    applicationDeadline: program.deadline || '',
    fundingDeadline: program.funding_deadline || '',
    fundingAvailable: program.funding_available || false,
    notes: program.notes || '',
    tuition: program.tuition || '',
    ranking: program.ranking || '',
    round: program.application_round || '',
  };
}

function ApplicationCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-2 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
        </div>
      </CardContent>
    </Card>
  );
}

interface ApplicationCardProps {
  program: ProgramWithProgress & { daysUntil: number | null };
  navigate: (path: string) => void;
  getStatusBadge: (status: string) => React.ReactNode;
  isSubmitted: (status: string) => boolean;
  handleMarkSubmitted: (program: ProgramWithProgress) => void;
  handleEditProgram: (program: ProgramWithProgress) => void;
  onDeleted: (id: string) => void;
  isSelected: boolean;
  isSelectionMode: boolean;
  toggleSelection: (id: string, force?: boolean) => void;
}

function ApplicationCard({
  program,
  navigate,
  getStatusBadge,
  isSubmitted,
  handleMarkSubmitted,
  handleEditProgram,
  onDeleted,
  isSelected,
  isSelectionMode,
  toggleSelection,
}: ApplicationCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const daysUntil = program.daysUntil;
  const progress =
    program.checklistTotal > 0
      ? (program.checklistDone / program.checklistTotal) * 100
      : 0;
  const submitted = isSubmitted(program.status);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await Promise.all([
        supabase.from('checklist_items').delete().eq('program_id', program.id),
        supabase.from('program_notes').delete().eq('program_id', program.id),
        supabase.from('recommenders').delete().eq('program_id', program.id),
        supabase.from('portal_links').delete().eq('program_id', program.id),
        supabase.from('program_documents').delete().eq('program_id', program.id)
      ]);
      const { error } = await supabase.from('programs').delete().eq('id', program.id);
      if (error) throw error;
      onDeleted(program.id);
      toast.success('Application deleted');
    } catch {
      toast.error('Failed to delete — please try again');
      setConfirming(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleSelection(program.id, true);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.preventDefault();
      e.stopPropagation();
      toggleSelection(program.id);
    }
  };

  return (
    <Card 
      className={`transition-shadow ${isSelected ? 'border-[#4F46E5] ring-1 ring-[#4F46E5] bg-[#4F46E5]/5' : 'hover:shadow-md'} ${isSelectionMode ? 'cursor-pointer' : ''}`}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
    >
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 flex items-start gap-3">
                  <div>
                    <h3 className="text-base md:text-lg">{program.school_name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {program.degree_type} in {program.program_name}
                    </p>
                    {program.country && (
                      <p className="text-xs text-muted-foreground mt-1">{program.country}</p>
                    )}
                  </div>
                </div>
                {getStatusBadge(program.status)}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Deadline</p>
              <p className="text-sm mt-1">{formatDate(program.deadline)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {daysUntil === null
                  ? 'No deadline'
                  : daysUntil >= 0
                  ? `${daysUntil} days left`
                  : 'Passed'}
              </p>
            </div>

            {program.checklistTotal > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Progress</span>
                  <span>
                    {program.checklistDone}/{program.checklistTotal} items
                  </span>
                </div>
                <Progress value={progress} />
              </div>
            )}
          </div>

          <div className="flex md:flex-col gap-2 justify-end md:justify-start">
            {confirming ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Delete this application?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-red-600 font-medium hover:underline disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Yes, delete'}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  disabled={deleting}
                  className="text-muted-foreground hover:underline disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="flex-1 md:w-full"
                  onClick={() => navigate(`/applications/${program.id}`)}
                >
                  View
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                {!submitted && (
                  <Button
                    size="sm"
                    className="flex-1 md:w-full"
                    onClick={() => handleMarkSubmitted(program)}
                  >
                    Mark Submitted
                  </Button>
                )}
                <div className="flex gap-2 flex-1 md:w-full">
                  {!submitted && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1"
                      onClick={() => handleEditProgram(program)}
                    >
                      Edit
                    </Button>
                  )}
                  <button
                    onClick={() => setConfirming(true)}
                    title="Delete application"
                    className="flex items-center justify-center w-9 h-9 rounded-md text-[#DC2626] bg-transparent hover:bg-[#FCEBEB] transition-colors shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { useSelection } from '../../hooks/useSelection';

export function Applications() {
  const [isAddSchoolOpen, setIsAddSchoolOpen] = useState(false);
  const [programs, setPrograms] = useState<ProgramWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatuses, setActiveStatuses] = usePersistedState<string[]>('apps_status_filters', []);
  const [filterDegrees, setFilterDegrees] = usePersistedState<string[]>('apps_degree_filters', []);
  const [filterFunding, setFilterFunding] = usePersistedState<string>('apps_funding_filter_v2', '');
  const [filterCountries, setFilterCountries] = usePersistedState<string[]>('apps_country_filters', []);
  const [filterRounds, setFilterRounds] = usePersistedState<string[]>('apps_round_filters', []);
  const [sortOption, setSortOption] = usePersistedState<string>('apps_sort_v3', 'nearest-deadline');
  const [sortOrder, setSortOrder] = usePersistedState<'asc' | 'desc'>('apps_sort_order', 'asc');
  const [showFilter, setShowFilter] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const SORT_OPTIONS = [
    { value: 'nearest-deadline', label: 'Deadline' },
    { value: 'recently-added', label: 'Recent' },
    { value: 'progress-high', label: 'Progress' },
    { value: 'name-az', label: 'Name A-Z' },
  ];

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortOption)?.label || 'Sort';


  const activeFilterCount =
    activeStatuses.length +
    filterDegrees.length +
    filterCountries.length +
    filterRounds.length +
    (filterFunding ? 1 : 0);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<SchoolFormData | undefined>(undefined);
  const [fetchError, setFetchError] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const isOnline = useOnlineStatus();

  const {
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelectionMode,
  } = useSelection();

  const navigate = useNavigate();

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    const idsToDelete = Array.from(selectedIds);
    try {
      await Promise.all([
        supabase.from('checklist_items').delete().in('program_id', idsToDelete),
        supabase.from('program_notes').delete().in('program_id', idsToDelete),
        supabase.from('recommenders').delete().in('program_id', idsToDelete),
        supabase.from('portal_links').delete().in('program_id', idsToDelete),
        supabase.from('program_documents').delete().in('program_id', idsToDelete)
      ]);
      const { error } = await supabase.from('programs').delete().in('id', idsToDelete);
      if (error) throw error;
      
      setPrograms(prev => prev.filter(p => !selectedIds.has(p.id)));
      clearSelection();
      setShowBulkDeleteModal(false);
      toast.success(`${idsToDelete.length} applications deleted`);
    } catch {
      toast.error('Failed to delete applications');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const fetchPrograms = useCallback(async () => {
    setLoading(true);

    if (!navigator.onLine) {
      setFetchError(true);
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPrograms([]);
        setLoading(false);
        return;
      }

      const { data: programRows, error } = await supabase
        .from('programs')
        .select('id, school_name, program_name, status, deadline, created_at, degree_type, country, funding_available, department, tuition, ranking, portal_url, application_round, funding_deadline, notes')
        .eq('user_id', user.id)
        .order('deadline', { ascending: true });

      if (error) throw error;

      setFetchError(false);

      const rows = (programRows ?? []) as DbProgram[];

      const withProgress = await Promise.all(
        rows.map(async program => {
          const { data: items } = await supabase
            .from('checklist_items')
            .select('id, is_done')
            .eq('program_id', program.id);

          const checklistItems = items ?? [];
          const checklistDone = checklistItems.filter(i => i.is_done).length;
          const checklistTotal = checklistItems.length;

          return {
            ...program,
            checklistDone,
            checklistTotal,
          };
        })
      );

      setPrograms(withProgress);
    } catch (err: any) {
      if (
        !navigator.onLine ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('network') ||
        err.code === 'NETWORK_ERROR'
      ) {
        setFetchError(true);
      } else {
        toast.error('Failed to load data');
        setFetchError(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  // Auto-retry when coming back online
  useEffect(() => {
    if (isOnline && fetchError) {
      setFetchError(false);
      fetchPrograms();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const handleEditProgram = (program: ProgramWithProgress) => {
    setEditFormData(programToFormData(program));
    setEditingProgramId(program.id);
    setIsAddSchoolOpen(true);
  };

  const handleMarkSubmitted = async (program: ProgramWithProgress) => {
    const { error } = await supabase
      .from('programs')
      .update({ status: 'Submitted' })
      .eq('id', program.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setPrograms(prev =>
      prev.map(p => (p.id === program.id ? { ...p, status: 'Submitted' } : p))
    );
    toast.success('Application marked as submitted!');
  };

  const availableCountries = useMemo(() => {
    const countries = new Set(programs.map(p => p.country).filter(Boolean));
    return Array.from(countries).sort();
  }, [programs]);

  const availableRounds = useMemo(() => {
    const rounds = new Set(
      programs.map(p => (p as any).application_round).filter(Boolean)
    );
    return Array.from(rounds).sort();
  }, [programs]);

  const filteredPrograms = useMemo(() => {
    let filtered = programs.map(program => ({
      ...program,
      daysUntil: getDaysUntil(program.deadline),
    }));

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        program =>
          program.school_name.toLowerCase().includes(query) ||
          program.program_name.toLowerCase().includes(query)
      );
    }

    if (activeStatuses.length > 0) {
      filtered = filtered.filter(program =>
        activeStatuses.some(s => normalizeStatus(program.status) === normalizeStatus(s))
      );
    }

    if (filterDegrees.length > 0) {
      filtered = filtered.filter(program => filterDegrees.includes(program.degree_type));
    }

    if (filterCountries.length > 0) {
      filtered = filtered.filter(program => filterCountries.includes(program.country));
    }

    if (filterRounds.length > 0) {
      filtered = filtered.filter(program => filterRounds.includes((program as any).application_round));
    }

    if (filterFunding === 'yes') {
      filtered = filtered.filter(program => program.funding_available);
    } else if (filterFunding === 'no') {
      filtered = filtered.filter(program => !program.funding_available);
    }

    return filtered;
  }, [
    programs,
    searchQuery,
    activeStatuses,
    filterDegrees,
    filterCountries,
    filterRounds,
    filterFunding,
    sortOrder,
  ]);

  const sortedPrograms = useMemo(() => {
    return [...filteredPrograms].sort((a, b) => {
      let comparison = 0;
      switch (sortOption) {
        case 'nearest-deadline':
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          comparison = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          break;
        case 'recently-added':
          comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          break;
        case 'progress': {
          const aP = a.checklistTotal > 0 ? a.checklistDone / a.checklistTotal : 0;
          const bP = b.checklistTotal > 0 ? b.checklistDone / b.checklistTotal : 0;
          comparison = bP - aP; // high to low by default; asc/desc toggle reverses
          break;
        }
        case 'name-az':
          comparison = a.school_name.localeCompare(b.school_name);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredPrograms, sortOption, sortOrder]);


  const getStatusBadge = (status: string) => {
    const key = normalizeStatus(status);
    const variants: Record<string, { variant: 'outline' | 'default' | 'secondary' | 'destructive'; label: string }> = {
      'Not Started': { variant: 'outline', label: 'Not Started' },
      'In Progress': { variant: 'secondary', label: 'In Progress' },
      'Ready to Submit': { variant: 'default', label: 'Ready to Submit' },
      submitted: { variant: 'default', label: 'Submitted' },
      accepted: { variant: 'default', label: 'Accepted' },
      rejected: { variant: 'destructive', label: 'Rejected' },
      interview: { variant: 'secondary', label: 'Interview' },
      waitlisted: { variant: 'secondary', label: 'Waitlisted' },
    };
    const config = variants[key] || {
      variant: 'outline' as const,
      label: displayProgramStatus(status),
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const isSubmitted = (status: string) => normalizeStatus(status) === 'submitted';

  if (loading) return <PageSkeleton />;

  if (fetchError || !isOnline) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <PageHeader
          title="Applications"
          subtitle="Manage and track all your program applications"
          backTo="/dashboard"
        />
        <OfflinePage
          onRetry={() => { setFetchError(false); fetchPrograms(); }}
          pageName="your applications"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader 
        title="All Applications"
        subtitle="Manage all your graduate school applications"
        backTo="/dashboard"
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        <div className="flex justify-end mb-2">
          <Button onClick={() => setIsAddSchoolOpen(true)} className="hidden md:flex">
            <Plus className="h-4 w-4 mr-2" />
            Add New School
          </Button>
        </div>

      <FABButton onClick={() => setIsAddSchoolOpen(true)} />

      <AddSchoolDialog
        open={isAddSchoolOpen}
        onOpenChange={open => {
          setIsAddSchoolOpen(open);
          if (!open) {
            setEditingProgramId(null);
            setEditFormData(undefined);
          }
        }}
        onSuccess={() => {
          setEditingProgramId(null);
          setEditFormData(undefined);
          fetchPrograms();
        }}
        initialData={editFormData}
        isEditing={!!editingProgramId}
        editingProgramId={editingProgramId}
      />

      {programs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <h2 className="text-lg mb-2">No applications yet</h2>
          <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
            Add a school to create your first application workspace.
          </p>
          <Button onClick={() => setIsAddSchoolOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add New School
          </Button>
        </div>
      ) : (
        <>
            <div className="space-y-4">
              {/* Single-row toolbar */}
              <div className="flex items-center gap-2 px-4 md:px-6 py-3">
                {/* Search */}
                <div className="relative flex-1 min-w-0">
                  <Search size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Filter icon button */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFilter(!showFilter);
                      setShowSortMenu(false);
                    }}
                    className={`p-2 border rounded-lg hover:bg-accent transition-colors relative ${
                      activeFilterCount > 0
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-border'
                    }`}
                  >
                    <SlidersHorizontal size={16} />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center font-medium">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  {/* Filter popup — bottom sheet on mobile, dropdown on desktop */}
                  {showFilter && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-40 bg-black/40"
                        onClick={() => setShowFilter(false)}
                      />

                      {/* Desktop: dropdown | Mobile: bottom sheet */}
                      <div className="fixed z-50 bg-background border border-border shadow-xl md:absolute md:right-0 md:top-full md:mt-2 md:w-80 md:rounded-xl md:max-h-[80vh] md:overflow-y-auto inset-x-0 bottom-0 rounded-t-2xl max-h-[80vh] flex flex-col md:inset-x-auto md:bottom-auto md:rounded-xl md:flex-none">

                        {/* Drag handle — mobile only */}
                        <div className="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
                          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                          <span className="text-sm font-semibold">Filters</span>
                          <div className="flex items-center gap-3">
                            {activeFilterCount > 0 && (
                              <button
                                onClick={() => {
                                  setActiveStatuses([]);
                                  setFilterDegrees([]);
                                  setFilterFunding('');
                                }}
                                className="text-xs text-red-500 hover:underline"
                              >
                                Clear all
                              </button>
                            )}
                            <button
                              onClick={() => setShowFilter(false)}
                              className="p-1 rounded-lg hover:bg-accent md:hidden"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Scrollable content */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

                          {/* Status */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Status</p>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                'All',
                                'Not Started',
                                'In Progress',
                                'Ready to Submit',
                                'Submitted',
                                'Interview',
                                'Accepted',
                                'Rejected',
                                'Waitlisted'
                              ].map(status => (
                                <button
                                  key={status}
                                  onClick={() => {
                                    if (status === 'All') {
                                      setActiveStatuses([]);
                                    } else {
                                      setActiveStatuses(prev =>
                                        prev.includes(status)
                                          ? prev.filter(s => s !== status)
                                          : [...prev, status]
                                      );
                                    }
                                  }}
                                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                    status === 'All'
                                      ? activeStatuses.length === 0
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-muted text-muted-foreground hover:bg-accent'
                                      : activeStatuses.includes(status)
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-muted text-muted-foreground hover:bg-accent'
                                  }`}
                                >
                                  {status}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Degree Type */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Degree Type</p>
                            <div className="flex flex-wrap gap-1.5">
                              {['MSc', 'PhD', 'MBA', 'Other'].map(degree => (
                                <button
                                  key={degree}
                                  onClick={() => {
                                    setFilterDegrees(prev =>
                                      prev.includes(degree)
                                        ? prev.filter(d => d !== degree)
                                        : [...prev, degree]
                                    );
                                  }}
                                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                    filterDegrees.includes(degree)
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-muted text-muted-foreground hover:bg-accent'
                                  }`}
                                >
                                  {degree}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Funding */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Funding</p>
                            <div className="flex gap-1.5">
                              {[
                                { label: 'Any', value: '' },
                                { label: 'Available', value: 'yes' },
                                { label: 'Not available', value: 'no' },
                              ].map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={() =>
                                    setFilterFunding(
                                      filterFunding === opt.value ? '' : opt.value
                                    )
                                  }
                                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                    filterFunding === opt.value
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-muted text-muted-foreground hover:bg-accent'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Footer — mobile only */}
                        <div className="md:hidden px-4 py-3 border-t border-border flex-shrink-0">
                          <button
                            onClick={() => setShowFilter(false)}
                            className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium"
                          >
                            Apply filters
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Sort dropdown */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSortMenu(!showSortMenu);
                      setShowFilter(false);
                    }}
                    className="flex items-center gap-1.5 py-2 px-3 text-sm border border-border rounded-lg hover:bg-accent bg-background"
                  >
                    {currentSortLabel}
                    <ChevronDown size={14} />
                  </button>

                  {showSortMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowSortMenu(false)}
                      />
                      <div className="absolute z-50 top-full mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden right-0 min-w-[140px]">
                        {SORT_OPTIONS.map(option => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setSortOption(option.value);
                              setShowSortMenu(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                              sortOption === option.value
                                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 font-medium'
                                : 'text-foreground'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Asc/Desc toggle */}
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-2 border border-border rounded-lg hover:bg-accent flex-shrink-0 transition-colors"
                  title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                >
                  {sortOrder === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                </button>
              </div>

              <p className="text-[13px] text-muted-foreground px-4 md:px-6">
                Showing {filteredPrograms.length}{' '}
                {filteredPrograms.length === 1 ? 'application' : 'applications'}
              </p>
            </div>

          {isSelectionMode && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <Checkbox 
                  checked={selectedIds.size === filteredPrograms.length && filteredPrograms.length > 0}
                  onCheckedChange={() => selectAll(filteredPrograms.map(p => p.id))}
                />
                <span className="text-sm font-medium">
                  {selectedIds.size} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowBulkDeleteModal(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </div>
          )}

          {filteredPrograms.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No applications match your search or filters.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {sortedPrograms.map(program => (
                <ApplicationCard
                  key={program.id}
                  program={program}
                  navigate={navigate}
                  getStatusBadge={getStatusBadge}
                  isSubmitted={isSubmitted}
                  handleMarkSubmitted={handleMarkSubmitted}
                  handleEditProgram={handleEditProgram}
                  onDeleted={id => {
                    setPrograms(prev => prev.filter(p => p.id !== id));
                    if (selectedIds.has(id)) {
                      toggleSelection(id, false);
                    }
                  }}
                  isSelected={selectedIds.has(program.id)}
                  isSelectionMode={isSelectionMode}
                  toggleSelection={toggleSelection}
                />
              ))}
            </div>
          )}

          <Dialog open={showBulkDeleteModal} onOpenChange={setShowBulkDeleteModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Delete Applications
                </DialogTitle>
                <DialogDescription className="pt-2">
                  Are you sure you want to delete {selectedIds.size} selected {selectedIds.size === 1 ? 'application' : 'applications'}? This action is <strong>irreversible</strong> and will delete all associated checklists, notes, recommenders, and links.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setShowBulkDeleteModal(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleBulkDelete} disabled={isBulkDeleting}>
                  {isBulkDeleting ? 'Deleting...' : 'Yes, delete'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
      </div>
    </div>
  );
}
