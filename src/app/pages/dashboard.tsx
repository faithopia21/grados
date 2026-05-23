import { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { AddSchoolDialog } from '../components/add-school-dialog';
import { getDaysUntil, getDeadlineStatus, formatDate } from '../../lib/utils';
import { displayProgramStatus } from '../../lib/program-status';
import { Calendar, Clock, ArrowRight, Plus, DollarSign, Check } from 'lucide-react';
import { FABButton } from '../components/layout/fab-button';
import { supabase } from '../../lib/supabase';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { OfflinePage } from '../components/offline-page';
import { PageSkeleton } from '../components/page-skeleton';

export interface DbProgram {
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
  nextStep?: string | null;
  hasChecklist?: boolean;
}

function mapDbStatus(status: string) {
  const normalized = status?.toLowerCase().replace(/\s+/g, '_');
  if (normalized === 'Not Started') return 'Not Started';
  if (normalized === 'In Progress') return 'In Progress';
  if (normalized === 'submitted') return 'submitted';
  if (normalized === 'Ready to Submit') return 'Ready to Submit';
  return 'Not Started';
}

export function Dashboard() {
  const [isAddSchoolOpen, setIsAddSchoolOpen] = useState(false);
  const [programs, setPrograms] = useState<DbProgram[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();

  const fetchPrograms = useCallback(async () => {
    setLoadingPrograms(true);

    if (!navigator.onLine) {
      setFetchError(true);
      setLoadingPrograms(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPrograms([]);
        setLoadingPrograms(false);
        return;
      }

      const { data, error } = await supabase
        .from('programs')
        .select('id, school_name, program_name, status, deadline, created_at, funding_available, country')
        .eq('user_id', user.id)
        .order('deadline', { ascending: true });

      if (error) throw error;

      setFetchError(false);

      if (data) {
        const programsWithNextStep = await Promise.all(
          (data as DbProgram[]).map(async program => {
            const [countRes, nextItemRes] = await Promise.all([
              supabase
                .from('checklist_items')
                .select('*', { count: 'exact', head: true })
                .eq('program_id', program.id),
              supabase
                .from('checklist_items')
                .select('label')
                .eq('program_id', program.id)
                .eq('is_done', false)
                .order('created_at', { ascending: true })
                .limit(1)
                .maybeSingle()
            ]);

            const hasChecklist = (countRes.count ?? 0) > 0;
            const nextItem = nextItemRes.data;

            return {
              ...program,
              nextStep: nextItem?.label ?? null,
              hasChecklist,
            };
          })
        );
        setPrograms(programsWithNextStep);
      }
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
      setLoadingPrograms(false);
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

  const stats = useMemo(() => {
    const total = programs.length;
    const submitted = programs.filter(p => mapDbStatus(p.status) === 'submitted').length;
    const inProgress = programs.filter(p => mapDbStatus(p.status) === 'In Progress').length;
    const notStarted = programs.filter(p => mapDbStatus(p.status) === 'Not Started').length;

    return { total, submitted, inProgress, notStarted };
  }, [programs]);

  const upcomingDeadlines = useMemo(() => {
    return programs
      .map(program => ({
        ...program,
        daysUntil: getDaysUntil(program.deadline),
        status: mapDbStatus(program.status),
      }))
      .filter(program => program.daysUntil !== null && program.daysUntil >= 0 && program.status !== 'submitted')
      .sort((a, b) => (a.daysUntil as number) - (b.daysUntil as number))
      .slice(0, 5);
  }, [programs]);

  const recentPrograms = useMemo(() => programs.slice(0, 4), [programs]);

  const getStatusBadge = (status: string) => {
    const mapped = mapDbStatus(status);
    const variants: Record<string, { variant: 'outline' | 'default' | 'secondary' | 'destructive'; label: string }> = {
      'Not Started': { variant: 'outline', label: 'Not Started' },
      'In Progress': { variant: 'secondary', label: 'In Progress' },
      'Ready to Submit': { variant: 'default', label: 'Ready to Submit' },
      submitted: { variant: 'default', label: 'Submitted' },
    };
    const config = variants[mapped] || {
      variant: 'outline' as const,
      label: displayProgramStatus(status),
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getUrgencyPillStyle = (daysUntil: number) => {
    if (daysUntil <= 7) {
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    } else if (daysUntil <= 14) {
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    } else {
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    }
  };

  if (loadingPrograms) return <PageSkeleton />;

  if (fetchError || !isOnline) {
    return (
      <OfflinePage
        onRetry={() => { setFetchError(false); fetchPrograms(); }}
        pageName="your dashboard"
      />
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Overview of your graduate application journey
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
        onOpenChange={setIsAddSchoolOpen}
        onSuccess={fetchPrograms}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.inProgress} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{stats.submitted}</div>
            <div className="mt-2">
              <Progress value={(stats.submitted / (stats.total || 1)) * 100} className="h-1.5 bg-muted" />
              <p className="text-xs text-muted-foreground mt-1">
                {stats.submitted} / {stats.total}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl ${upcomingDeadlines.filter(d => d.daysUntil <= 14).length > 0 ? 'text-red-600' : ''}`}>
              {upcomingDeadlines.filter(d => d.daysUntil <= 14).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              within 14 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Not Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{stats.notStarted}</div>
            <p className="text-xs text-muted-foreground mt-1">
              awaiting action
            </p>
          </CardContent>
        </Card>
      </div>

      {programs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="relative mb-6">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="12" width="40" height="48" rx="4" stroke="#C7D2FE" strokeWidth="2" fill="#EEF2FF" />
              <rect x="12" y="16" width="40" height="48" rx="4" stroke="#C7D2FE" strokeWidth="2" fill="#EEF2FF" />
              <rect x="16" y="20" width="40" height="48" rx="4" stroke="#C7D2FE" strokeWidth="2" fill="#EEF2FF" />
            </svg>
          </div>
          <h2 className="text-lg mb-2">Your application hub is empty</h2>
          <p className="text-sm text-muted-foreground text-center mb-6" style={{ maxWidth: '380px' }}>
            Add your first school to start tracking your graduate applications.
          </p>
          <Button onClick={() => setIsAddSchoolOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add your first school
          </Button>
        </div>
      ) : (
        <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>Applications due soon</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingDeadlines.map(program => (
              <div
                key={program.id}
                className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/applications/${program.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="truncate">{program.school_name}</h4>
                    {program.daysUntil !== null ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getUrgencyPillStyle(program.daysUntil as number)}`}>
                        {program.daysUntil}d
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        No deadline
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {program.degree_type} in {program.program_name}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Due {formatDate(program.deadline)}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            ))}
            {upcomingDeadlines.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No upcoming deadlines
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription>Your most recent application activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentPrograms.map(program => (
              <div
                key={program.id}
                className="p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/applications/${program.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="truncate">{program.school_name}</h4>
                      {program.funding_available && (
                        <DollarSign className="h-4 w-4 text-green-600" title="Funding Available" />
                      )}
                      {getStatusBadge(program.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {program.degree_type} in {program.program_name}
                    </p>
                    {program.country && (
                      <p className="text-xs text-muted-foreground mt-1">{program.country}</p>
                    )}
                    {program.nextStep ? (
                      <div className="flex items-center gap-1 mt-2">
                        <ArrowRight size={11} className="text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">Next step:</span>
                        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 truncate">
                          {program.nextStep}
                        </span>
                      </div>
                    ) : program.nextStep === null && program.hasChecklist ? (
                      <div className="flex items-center gap-1 mt-2">
                        <Check size={11} className="text-green-600 flex-shrink-0" />
                        <span className="text-xs text-green-600">All tasks complete</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mt-2">
                        <ArrowRight size={11} className="text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">No checklist added yet</span>
                      </div>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>What would you like to do?</CardDescription>
        </CardHeader>
        <CardContent className="flex overflow-x-auto md:grid md:grid-cols-2 gap-3 pb-2 no-scrollbar">
          <Button onClick={() => setIsAddSchoolOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add New School
          </Button>
          <Button variant="outline" onClick={() => navigate('/deadlines')}>
            <Calendar className="h-4 w-4 mr-2" />
            View Deadlines
          </Button>
          <Button variant="outline" onClick={() => navigate('/applications')}>
            View Applications
          </Button>
          <Button variant="outline" onClick={() => navigate('/documents')}>
            Manage Documents
          </Button>
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}
