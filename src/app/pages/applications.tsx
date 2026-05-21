import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { AddSchoolDialog, SchoolFormData } from '../components/add-school-dialog';
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
import { getDaysUntil, formatDate } from '../../lib/utils';
import { Plus, ArrowRight, Search, ChevronDown } from 'lucide-react';
import { FABButton } from '../components/layout/fab-button';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { displayProgramStatus } from '../../lib/program-status';

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
}

interface ProgramWithProgress extends DbProgram {
  checklistDone: number;
  checklistTotal: number;
}

type StatusFilter =
  | 'all'
  | 'not_started'
  | 'in_progress'
  | 'ready_to_submit'
  | 'submitted'
  | 'accepted'
  | 'rejected';

type SortOption = 'deadline' | 'recent' | 'progress-high' | 'progress-low' | 'name';

function normalizeStatus(status: string): string {
  return status?.toLowerCase().replace(/\s+/g, '_') ?? 'not_started';
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
    universityName: program.school_name,
    programName: program.program_name,
    degree,
    country: program.country ?? '',
    department: '',
    portalUrl: program.portal_url ?? '',
    applicationDeadline: program.deadline,
    fundingDeadline: '',
    fundingAvailable: program.funding_available,
    notes: '',
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

  const navigate = useNavigate();

  const fetchPrograms = useCallback(async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setPrograms([]);
      setLoading(false);
      return;
    }

    const { data: programRows, error } = await supabase
      .from('programs')
      .select('*')
      .eq('user_id', user.id)
      .order('deadline', { ascending: true });

    if (error) {
      toast.error(error.message);
      setPrograms([]);
      setLoading(false);
      return;
    }

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
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

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
      filtered = filtered.filter(program => program.daysUntil >= 0 && program.daysUntil <= 30);
    } else if (deadlineFilter === 'next_3_months') {
      filtered = filtered.filter(program => program.daysUntil >= 0 && program.daysUntil <= 90);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'deadline') {
        return a.daysUntil - b.daysUntil;
      }
      if (sortBy === 'recent') {
        return b.id.localeCompare(a.id);
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
      not_started: { variant: 'outline', label: 'Not Started' },
      in_progress: { variant: 'secondary', label: 'In Progress' },
      ready_to_submit: { variant: 'default', label: 'Ready to Submit' },
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

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Applications</h1>
          <p className="text-muted-foreground mt-2">
            Manage all your graduate school applications
          </p>
        </div>
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

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => (
            <ApplicationCardSkeleton key={i} />
          ))}
        </div>
      ) : programs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <h2 className="text-lg mb-2">No applications yet</h2>
          <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
            Add your first school to start tracking deadlines, documents, and requirements.
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
                    : statusFilter === 'not_started'
                      ? 'Not Started'
                      : statusFilter === 'in_progress'
                        ? 'In Progress'
                        : statusFilter === 'ready_to_submit'
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
                    checked={statusFilter === 'not_started'}
                    onCheckedChange={() => setStatusFilter('not_started')}
                  >
                    Not Started
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter === 'in_progress'}
                    onCheckedChange={() => setStatusFilter('in_progress')}
                  >
                    In Progress
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter === 'ready_to_submit'}
                    onCheckedChange={() => setStatusFilter('ready_to_submit')}
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

          {filteredPrograms.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No applications match your search or filters.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredPrograms.map(program => {
                const daysUntil = program.daysUntil;
                const progress =
                  program.checklistTotal > 0
                    ? (program.checklistDone / program.checklistTotal) * 100
                    : 0;
                const submitted = isSubmitted(program.status);

                return (
                  <Card key={program.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
                        <div className="flex-1 space-y-4">
                          <div>
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="text-base md:text-lg">{program.school_name}</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {program.degree_type} in {program.program_name}
                                </p>
                                {program.country && (
                                  <p className="text-xs text-muted-foreground mt-1">{program.country}</p>
                                )}
                              </div>
                              {getStatusBadge(program.status)}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground">Deadline</p>
                            <p className="text-sm mt-1">{formatDate(program.deadline)}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {daysUntil >= 0 ? `${daysUntil} days left` : 'Passed'}
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
                          {!submitted && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="flex-1 md:w-full"
                              onClick={() => handleEditProgram(program)}
                            >
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
