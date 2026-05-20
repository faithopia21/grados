import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { AddSchoolDialog, SchoolFormData } from '../components/add-school-dialog';
import { useApplications } from '../../contexts/ApplicationContext';
import { getDaysUntil, getDeadlineStatus, formatDate } from '../../lib/utils';
import { Calendar, Clock, TrendingUp, AlertCircle, CheckCircle2, ArrowRight, Plus, DollarSign } from 'lucide-react';
import { FABButton } from '../components/layout/fab-button';
import { toast } from 'sonner';

export function Dashboard() {
  const [isAddSchoolOpen, setIsAddSchoolOpen] = useState(false);
  const navigate = useNavigate();
  const { applications, universities, programs, addApplication, addUniversity, addProgram } =
    useApplications();
  const stats = useMemo(() => {
    const total = applications.length;
    const submitted = applications.filter(app => app.status === 'submitted').length;
    const inProgress = applications.filter(app => app.status === 'in_progress').length;
    const notStarted = applications.filter(app => app.status === 'not_started').length;

    return { total, submitted, inProgress, notStarted };
  }, [applications]);

  const upcomingDeadlines = useMemo(() => {
    return applications
      .map(app => ({
        ...app,
        university: universities.find(u => u.id === app.universityId)!,
        program: programs.find(p => p.id === app.programId)!,
        daysUntil: getDaysUntil(app.deadline),
      }))
      .filter(app => app.daysUntil >= 0 && app.status !== 'submitted')
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);
  }, [applications, universities, programs]);

  const recentApplications = useMemo(() => {
    return applications
      .map(app => ({
        ...app,
        university: universities.find(u => u.id === app.universityId)!,
        program: programs.find(p => p.id === app.programId)!,
      }))
      .slice(0, 4);
  }, [applications, universities, programs]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      not_started: { variant: 'outline', label: 'Not Started' },
      in_progress: { variant: 'warning', label: 'In Progress' },
      ready_to_submit: { variant: 'default', label: 'Ready' },
      submitted: { variant: 'success', label: 'Submitted' },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getDeadlineBadgeVariant = (daysUntil: number) => {
    const status = getDeadlineStatus(daysUntil);
    if (status === 'urgent') return 'destructive';
    if (status === 'soon') return 'warning';
    return 'outline';
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

  const getNextStep = (app: any) => {
    if (app.status === 'submitted') return 'Wait for response';
    if (app.status === 'ready_to_submit') return 'Submit application';

    const incompleteReq = app.requirements.find((r: any) => !r.completed);
    if (incompleteReq) {
      if (incompleteReq.name.includes('SOP') || incompleteReq.name.includes('Statement')) {
        return 'Upload SOP';
      } else if (incompleteReq.name.includes('CV') || incompleteReq.name.includes('Resume')) {
        return 'Upload CV';
      } else if (incompleteReq.name.includes('Transcript')) {
        return 'Upload transcripts';
      } else if (incompleteReq.name.includes('Recommendation')) {
        return 'Request recommendation letter';
      } else if (incompleteReq.name.includes('Test') || incompleteReq.name.includes('TOEFL') || incompleteReq.name.includes('IELTS')) {
        return 'Upload test scores';
      }
      return `Complete ${incompleteReq.name}`;
    }

    return 'Review application';
  };

  const handleAddSchool = (data: SchoolFormData) => {
    // Create university
    const universityId = addUniversity({
      name: data.universityName,
      location: '', // We can add this to the form later
      country: data.country,
    });

    // Create program
    const programId = addProgram({
      universityId,
      name: data.programName,
      degree: data.degree,
      department: data.department,
      fundingAvailable: data.fundingAvailable,
    });

    // Create application with default requirements
    const defaultRequirements = [
      { id: `req-${Date.now()}-1`, name: 'Statement of Purpose', completed: false, required: true, status: 'not_started' as const },
      { id: `req-${Date.now()}-2`, name: 'CV/Resume', completed: false, required: true, status: 'not_started' as const },
      { id: `req-${Date.now()}-3`, name: 'Transcripts', completed: false, required: true, status: 'not_started' as const },
      { id: `req-${Date.now()}-4`, name: 'Letters of Recommendation', completed: false, required: true, status: 'not_started' as const },
      { id: `req-${Date.now()}-5`, name: 'English Test (TOEFL/IELTS)', completed: false, required: true, status: 'not_started' as const },
    ];

    addApplication({
      universityId,
      programId,
      status: 'not_started',
      deadline: data.applicationDeadline,
      portalLink: data.portalUrl,
      notes: data.notes,
      requirements: defaultRequirements,
      documents: [],
      supervisors: [],
      matchScore: 0,
      fundingLikelihood: data.fundingAvailable ? 50 : 0,
    });

    toast.success(`Added ${data.universityName} - ${data.degree} in ${data.programName}`);
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1>Dashboard</h1>
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
        onSubmit={handleAddSchool}
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
            <CardTitle className="text-sm">Pending Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">
              {applications.reduce((total, app) => {
                return total + app.requirements.filter(r => !r.completed).length;
              }, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              across all applications
            </p>
          </CardContent>
        </Card>
      </div>

      {applications.length === 0 ? (
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
            Add your first school and GradOS will help you track every deadline, document, and requirement in one place.
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
            {upcomingDeadlines.map(app => (
              <div
                key={app.id}
                className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/application/${app.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="truncate">{app.university.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getUrgencyPillStyle(app.daysUntil)}`}>
                      {app.daysUntil}d
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {app.program.degree} in {app.program.name}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Due {formatDate(app.deadline)}
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
            {recentApplications.map(app => {
              const completedReqs = app.requirements.filter(r => r.completed).length;
              const totalReqs = app.requirements.length;
              const progress = totalReqs > 0 ? (completedReqs / totalReqs) * 100 : 0;
              const appProgram = programs.find(p => p.id === app.programId);
              const nextStep = getNextStep(app);

              return (
                <div
                  key={app.id}
                  className="p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/application/${app.id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="truncate">{app.university.name}</h4>
                        {appProgram?.fundingAvailable && (
                          <DollarSign className="h-4 w-4 text-green-600" title="Funding Available" />
                        )}
                        {getStatusBadge(app.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {app.program.degree} in {app.program.name}
                      </p>
                      {totalReqs > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>Documents: {completedReqs}/{totalReqs}</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className="mb-2" />
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Next step:</span> {nextStep}
                          </p>
                        </div>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>What would you like to do?</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => setIsAddSchoolOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add New School
          </Button>
          <Button variant="outline" onClick={() => navigate('/deadlines')}>
            <Calendar className="h-4 w-4 mr-2" />
            View Deadlines
          </Button>
          <Button variant="outline" onClick={() => navigate('/profile')}>
            Update Profile
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
