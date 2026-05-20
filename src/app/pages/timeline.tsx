import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { useApplications } from '../../contexts/ApplicationContext';
import { getDaysUntil, getDeadlineStatus, formatDate } from '../../lib/utils';
import { formatApplicationStatus } from '../../lib/status-utils';
import { Calendar, Clock, AlertCircle, ArrowRight, ChevronDown, Download } from 'lucide-react';

export function Timeline() {
  const navigate = useNavigate();
  const { applications, universities, programs } = useApplications();

  const deadlines = useMemo(() => {
    return applications
      .map(app => {
        const university = universities.find(u => u.id === app.universityId);
        const program = programs.find(p => p.id === app.programId);
        const daysUntil = getDaysUntil(app.deadline);
        const status = getDeadlineStatus(daysUntil);

        return {
          ...app,
          university,
          program,
          daysUntil,
          deadlineStatus: status,
        };
      })
      .sort((a, b) => {
        const dateA = new Date(a.deadline).getTime();
        const dateB = new Date(b.deadline).getTime();
        return dateA - dateB;
      });
  }, [applications, universities, programs]);

  const urgentDeadlines = deadlines.filter(d => d.deadlineStatus === 'urgent' && d.daysUntil >= 0);
  const soonDeadlines = deadlines.filter(d => d.deadlineStatus === 'soon');
  const upcomingDeadlines = deadlines.filter(d => d.deadlineStatus === 'upcoming');
  const futureDeadlines = deadlines.filter(d => d.deadlineStatus === 'future');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'urgent':
        return 'bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-800';
      case 'soon':
        return 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-800';
      case 'upcoming':
        return 'bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-800';
      default:
        return 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-800';
    }
  };

  const getStatusBadgeVariant = (status: string): any => {
    switch (status) {
      case 'urgent':
        return 'destructive';
      case 'soon':
        return 'warning';
      case 'upcoming':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getLeftBorderColor = (status: string) => {
    switch (status) {
      case 'urgent':
        return 'border-l-red-600';
      case 'soon':
        return 'border-l-amber-600';
      case 'upcoming':
        return 'border-l-blue-600';
      default:
        return 'border-l-green-600';
    }
  };

  const DeadlineCard = ({ deadline }: { deadline: any }) => (
    <div
      className={`p-4 rounded-lg border transition-colors border-l-[3px] ${getLeftBorderColor(
        deadline.deadlineStatus
      )} border-border hover:bg-accent/50`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="truncate">{deadline.university?.name}</h4>
            <Badge variant={getStatusBadgeVariant(deadline.deadlineStatus)} className="text-xs">
              {deadline.daysUntil >= 0 ? `${deadline.daysUntil}d left` : 'Overdue'}
            </Badge>
            {deadline.deadlineStatus === 'urgent' && (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            {deadline.deadlineStatus === 'soon' && (
              <Clock className="h-4 w-4 text-amber-600" />
            )}
            {deadline.deadlineStatus === 'upcoming' && (
              <Calendar className="h-4 w-4 text-blue-600" />
            )}
            {deadline.deadlineStatus === 'future' && (
              <Calendar className="h-4 w-4 text-green-600" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {deadline.program?.degree} in {deadline.program?.name}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <Clock className="h-3 w-3" />
            <span>{formatDate(deadline.deadline)}</span>
            <span>•</span>
            <Badge
              variant={deadline.status === 'submitted' ? 'success' : 'outline'}
              className="text-xs"
            >
              {formatApplicationStatus(deadline.status)}
            </Badge>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/application/${deadline.id}`)}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1>Deadlines</h1>
        <p className="text-muted-foreground mt-2">
          All application deadlines in one calendar view
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Urgent</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-red-600">{urgentDeadlines.length}</div>
            <p className="text-xs text-muted-foreground mt-1">≤ 7 days away</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Soon</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-yellow-600">{soonDeadlines.length}</div>
            <p className="text-xs text-muted-foreground mt-1">8-30 days away</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-blue-600">{upcomingDeadlines.length}</div>
            <p className="text-xs text-muted-foreground mt-1">31-60 days away</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Future</CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-green-600">{futureDeadlines.length}</div>
            <p className="text-xs text-muted-foreground mt-1">&gt; 60 days away</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                All Schools <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>All Schools</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                All Deadline Types <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>All Deadline Types</DropdownMenuItem>
              <DropdownMenuItem>Application</DropdownMenuItem>
              <DropdownMenuItem>Funding</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                All Statuses <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>All Statuses</DropdownMenuItem>
              <DropdownMenuItem>Not Started</DropdownMenuItem>
              <DropdownMenuItem>In Progress</DropdownMenuItem>
              <DropdownMenuItem>Ready to Submit</DropdownMenuItem>
              <DropdownMenuItem>Submitted</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export .ics
        </Button>
      </div>

      {deadlines.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="mb-6">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
              <rect x="8" y="8" width="40" height="40" rx="4" stroke="#C7D2FE" strokeWidth="2" fill="#EEF2FF" />
              <line x1="16" y1="16" x2="40" y2="16" stroke="#C7D2FE" strokeWidth="2" strokeLinecap="round" />
              <line x1="16" y1="24" x2="28" y2="24" stroke="#C7D2FE" strokeWidth="2" strokeLinecap="round" />
              <line x1="16" y1="32" x2="28" y2="32" stroke="#C7D2FE" strokeWidth="2" strokeLinecap="round" />
              <circle cx="36" cy="28" r="4" stroke="#C7D2FE" strokeWidth="2" fill="#EEF2FF" />
            </svg>
          </div>
          <h3 className="text-base mb-2">No deadlines to track yet</h3>
          <p className="text-sm text-muted-foreground text-center mb-6" style={{ maxWidth: '380px' }}>
            Once you add programs, all their deadlines will appear here — colour-coded by urgency.
          </p>
          <Button onClick={() => navigate('/')}>
            Go to Dashboard →
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {urgentDeadlines.length > 0 && (
            <div className="space-y-3">
              {urgentDeadlines.map(deadline => (
                <DeadlineCard key={deadline.id} deadline={deadline} />
              ))}
            </div>
          )}

          {soonDeadlines.length > 0 && (
            <div className="space-y-3">
              {soonDeadlines.map(deadline => (
                <DeadlineCard key={deadline.id} deadline={deadline} />
              ))}
            </div>
          )}

          {upcomingDeadlines.length > 0 && (
            <div className="space-y-3">
              {upcomingDeadlines.map(deadline => (
                <DeadlineCard key={deadline.id} deadline={deadline} />
              ))}
            </div>
          )}

          {futureDeadlines.length > 0 && (
            <div className="space-y-3">
              {futureDeadlines.map(deadline => (
                <DeadlineCard key={deadline.id} deadline={deadline} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
