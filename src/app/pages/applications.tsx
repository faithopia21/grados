import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import { getDaysUntil, formatDate, safeGetTime } from '../../lib/utils';
import { Plus, ArrowRight, Search, ChevronDown, Trash2, AlertTriangle } from 'lucide-react';
import { FABButton } from '../components/layout/fab-button';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { displayProgramStatus } from '../../lib/program-status';
import { PageHeader } from '../components/page-header';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { OfflinePage } from '../components/offline-page';

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [countryFilters, setCountryFilters] = useState<string[]>([]);
  const [degreeFilters, setDegreeFilters] = useState<string[]>([]);
  const [fundingFilter, setFundingFilter] = useState<string[]>([]);
  const [deadlineFilter, setDeadlineFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('deadline');
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
        .select('id, school_name, program_name, status, deadline, created_at, degree_type, country, funding_available')
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

  const availableDegrees = useMemo(() => {
    const degrees = new Set(programs.map(p => p.degree_type).filter(Boolean));
    return Array.from(degrees).sort();
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

    if (statusFilter !== 'all') {
      filtered = filtered.filter(program => statusMatchesFilter(program.status, statusFilter));
    }

    if (countryFilters.length > 0) {
      filtered = filtered.filter(program => countryFilters.includes(program.country));
    }

    if (degreeFilters.length > 0) {
      filtered = filtered.filter(program => degreeFilters.includes(program.degree_type));
    }

    if (fundingFilter.length > 0) {
      if (fundingFilter.includes('yes') && !fundingFilter.includes('no')) {
        filtered = filtered.filter(program => program.funding_available);
      } else if (fundingFilter.includes('no') && !fundingFilter.includes('yes')) {
        filtered = filtered.filter(program => !program.funding_available);
      }
    }

    if (deadlineFilter === 'this_month') {
      filtered = filtered.filter(program => program.daysUntil !== null && program.daysUntil >= 0 && program.daysUntil <= 30);
    } else if (deadlineFilter === 'next_3_months') {
      filtered = filtered.filter(program => program.daysUntil !== null && program.daysUntil >= 0 && program.daysUntil <= 90);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'deadline') {
        // null deadlines sort to the end
        if (a.daysUntil === null && b.daysUntil === null) return 0;
        if (a.daysUntil === null) return 1;
        if (b.daysUntil === null) return -1;
        return a.daysUntil - b.daysUntil;
      }
      if (sortBy === 'recent') {
        return safeGetTime(b.created_at) - safeGetTime(a.created_at);
      }
      if (sortBy === 'progress-high') {
        const aProgress = a.checklistTotal > 0 ? a.checklistDone / a.checklistTotal : 0;
        const bProgress = b.checklistTotal > 0 ? b.checklistDone / b.checklistTotal : 0;
        return bProgress - aProgress;
      }
      if (sortBy === 'progress-low') {
        const aProgress = a.checklistTotal > 0 ? a.checklistDone / a.checklistTotal : 0;
        const bProgress = b.checklistTotal > 0 ? b.checklistDone / b.checklistTotal : 0;
        return aProgress - bProgress;
      }
      if (sortBy === 'name') {
        return a.school_name.localeCompare(b.school_name);
      }
      return 0;
    });

    return filtered;
  }, [
    programs,
    searchQuery,
    statusFilter,
    countryFilters,
    degreeFilters,
    fundingFilter,
    deadlineFilter,
    sortBy,
  ]);

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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by school or program name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 overflow-x-auto pb-1 -mx-1 px-1">
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all border bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-8 px-3">
                  {statusFilter === 'all'
                    ? 'All'
                    : statusFilter === 'Not Started'
                      ? 'Not Started'
                      : statusFilter === 'In Progress'
                        ? 'In Progress'
                        : statusFilter === 'Ready to Submit'
                          ? 'Ready to Submit'
                          : statusFilter === 'submitted'
                            ? 'Submitted'
                            : statusFilter === 'accepted'
                              ? 'Accepted'
                              : statusFilter === 'rejected'
                                ? 'Rejected'
                                : 'All'}{' '}
                  <ChevronDown className="h-4 w-4 ml-1" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuCheckboxItem
                    checked={statusFilter === 'all'}
                    onCheckedChange={() => setStatusFilter('all')}
                  >
                    All
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter === 'Not Started'}
                    onCheckedChange={() => setStatusFilter('Not Started')}
                  >
                    Not Started
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter === 'In Progress'}
                    onCheckedChange={() => setStatusFilter('In Progress')}
                  >
                    In Progress
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter === 'Ready to Submit'}
                    onCheckedChange={() => setStatusFilter('Ready to Submit')}
                  >
                    Ready to Submit
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter === 'submitted'}
                    onCheckedChange={() => setStatusFilter('submitted')}
                  >
                    Submitted
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter === 'accepted'}
                    onCheckedChange={() => setStatusFilter('accepted')}
                  >
                    Accepted
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter === 'rejected'}
                    onCheckedChange={() => setStatusFilter('rejected')}
                  >
                    Rejected
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all border bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-8 px-3">
                    Filter <ChevronDown className="h-4 w-4 ml-1" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Country</DropdownMenuLabel>
                    {availableCountries.map(country => (
                      <DropdownMenuCheckboxItem
                        key={country}
                        checked={countryFilters.includes(country)}
                        onCheckedChange={checked => {
                          setCountryFilters(prev =>
                            checked ? [...prev, country] : prev.filter(c => c !== country)
                          );
                        }}
                      >
                        {country}
                      </DropdownMenuCheckboxItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Degree Type</DropdownMenuLabel>
                    {availableDegrees.map(degree => (
                      <DropdownMenuCheckboxItem
                        key={degree}
                        checked={degreeFilters.includes(degree)}
                        onCheckedChange={checked => {
                          setDegreeFilters(prev =>
                            checked ? [...prev, degree] : prev.filter(d => d !== degree)
                          );
                        }}
                      >
                        {degree}
                      </DropdownMenuCheckboxItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Funding Available</DropdownMenuLabel>
                    <DropdownMenuCheckboxItem
                      checked={fundingFilter.includes('yes')}
                      onCheckedChange={checked => {
                        setFundingFilter(prev =>
                          checked ? [...prev, 'yes'] : prev.filter(f => f !== 'yes')
                        );
                      }}
                    >
                      Yes
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={fundingFilter.includes('no')}
                      onCheckedChange={checked => {
                        setFundingFilter(prev =>
                          checked ? [...prev, 'no'] : prev.filter(f => f !== 'no')
                        );
                      }}
                    >
                      No
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Deadline Range</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={deadlineFilter} onValueChange={setDeadlineFilter}>
                      <DropdownMenuRadioItem value="this_month">This month</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="next_3_months">Next 3 months</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all border bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-8 px-3">
                    Sort <ChevronDown className="h-4 w-4 ml-1" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuRadioGroup value={sortBy} onValueChange={v => setSortBy(v as SortOption)}>
                      <DropdownMenuRadioItem value="deadline">Nearest deadline</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="recent">Recently added</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="progress-high">Progress high to low</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="progress-low">Progress low to high</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="name">University name A–Z</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <p className="text-[13px] text-muted-foreground">
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
              {filteredPrograms.map(program => (
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
