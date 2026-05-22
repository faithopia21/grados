import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';
import {
  displayProgramStatus,
  getStatusBadgeClassName,
  getStatusBadgeVariant,
} from '../../lib/program-status';
import { Calendar, Clock, AlertCircle, ArrowRight, Download } from 'lucide-react';
import { PageHeader } from '../components/page-header';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { OfflinePage } from '../components/offline-page';

interface DbProgram {
  id: string;
  school_name: string;
  program_name: string;
  degree_type: string;
  country: string;
  deadline: string;
  status: string;
}

type UrgencyBucket = 'urgent' | 'soon' | 'upcoming' | 'future';

interface ProgramWithUrgency extends DbProgram {
  daysLeft: number;
  bucket: UrgencyBucket;
}

function getDaysLeft(deadline: string): number {
  return Math.ceil(
    (new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
}

function getUrgencyBucket(daysLeft: number): UrgencyBucket {
  if (daysLeft <= 7) return 'urgent';
  if (daysLeft <= 30) return 'soon';
  if (daysLeft <= 60) return 'upcoming';
  return 'future';
}

function getDaysBadgeClass(daysLeft: number): string {
  if (daysLeft <= 7) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (daysLeft <= 30) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
}

function getLeftBorderClass(bucket: UrgencyBucket): string {
  switch (bucket) {
    case 'urgent':
      return 'border-l-red-600';
    case 'soon':
      return 'border-l-amber-600';
    case 'upcoming':
      return 'border-l-blue-600';
    default:
      return 'border-l-green-600';
  }
}

function DeadlineCardSkeleton() {
  return <Skeleton className="h-24 w-full rounded-lg" />;
}

export function Timeline() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<ProgramWithUrgency[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const isOnline = useOnlineStatus();

  const fetchPrograms = useCallback(async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setPrograms([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('user_id', user.id)
      .order('deadline', { ascending: true });

    if (error) {
      if (!navigator.onLine) setFetchError(true);
      setPrograms([]);
      setLoading(false);
      return;
    }

    setFetchError(false);

    const withUrgency = ((data ?? []) as DbProgram[]).map(program => {
      const daysLeft = getDaysLeft(program.deadline);
      return {
        ...program,
        daysLeft,
        bucket: getUrgencyBucket(daysLeft),
      };
    });

    setPrograms(withUrgency);
    setLoading(false);
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

  const urgent = useMemo(() => programs.filter(p => p.bucket === 'urgent'), [programs]);
  const soon = useMemo(() => programs.filter(p => p.bucket === 'soon'), [programs]);
  const upcoming = useMemo(() => programs.filter(p => p.bucket === 'upcoming'), [programs]);
  const future = useMemo(() => programs.filter(p => p.bucket === 'future'), [programs]);

  const handleExportIcs = () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//GradOS//Application Deadlines//EN',
      ...programs.map(p => [
        'BEGIN:VEVENT',
        `DTSTART:${new Date(p.deadline)
          .toISOString()
          .replace(/-|:|\.\d{3}/g, '')
          .slice(0, 8)}`,
        `SUMMARY:${p.school_name} - ${p.program_name} deadline`,
        `DESCRIPTION:Application deadline for ${p.program_name} at ${p.school_name}`,
        'END:VEVENT',
      ].join('\r\n')),
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grados-deadlines.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  const DeadlineCard = ({ program }: { program: ProgramWithUrgency }) => (
    <div
      className={`p-4 rounded-lg border transition-colors border-l-[3px] ${getLeftBorderClass(
        program.bucket
      )} border-border hover:bg-accent/50`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h4 className="truncate font-medium">{program.school_name}</h4>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDaysBadgeClass(program.daysLeft)}`}
            >
              {program.daysLeft >= 0 ? `${program.daysLeft}d left` : 'Overdue'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {program.degree_type} in {program.program_name}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatDate(program.deadline)}</span>
            <Badge
              variant={getStatusBadgeVariant(program.status)}
              className={`text-xs ${getStatusBadgeClassName(program.status)}`}
            >
              {displayProgramStatus(program.status)}
            </Badge>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/applications/${program.id}`)}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  if (fetchError || (!isOnline && !loading && programs.length === 0)) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <PageHeader
          title="Deadlines"
          subtitle="All application deadlines in one place"
          backTo="/dashboard"
        />
        <OfflinePage
          onRetry={() => { setFetchError(false); fetchPrograms(); }}
          pageName="your deadlines"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader 
        title="Deadlines"
        subtitle="All application deadlines in one place"
        backTo="/dashboard"
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportIcs}
            disabled={loading || programs.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export .ics
          </Button>
        </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Urgent</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-red-600">{loading ? '—' : urgent.length}</div>
            <p className="text-xs text-muted-foreground mt-1">≤ 7 days away</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Soon</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-yellow-600">{loading ? '—' : soon.length}</div>
            <p className="text-xs text-muted-foreground mt-1">8–30 days away</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-blue-600">{loading ? '—' : upcoming.length}</div>
            <p className="text-xs text-muted-foreground mt-1">31–60 days away</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Future</CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-green-600">{loading ? '—' : future.length}</div>
            <p className="text-xs text-muted-foreground mt-1">&gt; 60 days away</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <DeadlineCardSkeleton key={i} />
          ))}
        </div>
      ) : programs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <h3 className="text-base mb-2">No deadlines yet</h3>
          <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
            Add schools from your dashboard and their deadlines will appear here.
          </p>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {urgent.length > 0 && (
            <div className="space-y-3">
              {urgent.map(p => (
                <DeadlineCard key={p.id} program={p} />
              ))}
            </div>
          )}
          {soon.length > 0 && (
            <div className="space-y-3">
              {soon.map(p => (
                <DeadlineCard key={p.id} program={p} />
              ))}
            </div>
          )}
          {upcoming.length > 0 && (
            <div className="space-y-3">
              {upcoming.map(p => (
                <DeadlineCard key={p.id} program={p} />
              ))}
            </div>
          )}
          {future.length > 0 && (
            <div className="space-y-3">
              {future.map(p => (
                <DeadlineCard key={p.id} program={p} />
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
