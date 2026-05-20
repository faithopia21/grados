import { useMemo } from 'react';
import { useParams, Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { mockApplications, mockUniversities, mockPrograms } from '../../data/mockData';
import { getDaysUntil, formatDate } from '../../lib/utils';
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Circle,
  FileText,
  Users,
  StickyNote,
  TrendingUp,
  DollarSign,
  Mail,
} from 'lucide-react';

export function SchoolWorkspace() {
  const { id } = useParams();

  const applicationData = useMemo(() => {
    const app = mockApplications.find(a => a.id === id);
    if (!app) return null;

    const university = mockUniversities.find(u => u.id === app.universityId);
    const program = mockPrograms.find(p => p.id === app.programId);
    const daysUntil = getDaysUntil(app.deadline);
    const completedReqs = app.requirements.filter(r => r.completed).length;
    const totalReqs = app.requirements.length;

    return { app, university, program, daysUntil, completedReqs, totalReqs };
  }, [id]);

  if (!applicationData) {
    return (
      <div className="p-8">
        <p>Application not found</p>
        <Link to="/">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const { app, university, program, daysUntil, completedReqs, totalReqs } = applicationData;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      not_started: 'text-muted-foreground',
      in_progress: 'text-yellow-600',
      ready_to_submit: 'text-blue-600',
      submitted: 'text-green-600',
    };
    return colors[status] || 'text-muted-foreground';
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1>{university?.name}</h1>
          <p className="text-muted-foreground mt-1">
            {program?.degree} in {program?.name} • {university?.location}, {university?.country}
          </p>
        </div>
        {app.portalLink && (
          <a href={app.portalLink} target="_blank" rel="noopener noreferrer">
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Portal
            </Button>
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Deadline</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl">{formatDate(app.deadline)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {daysUntil >= 0 ? `${daysUntil} days remaining` : 'Deadline passed'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Progress</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl">
              {completedReqs}/{totalReqs}
            </div>
            <Progress value={(completedReqs / totalReqs) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Match Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl">{app.matchScore}%</div>
            <p className="text-xs text-muted-foreground mt-1">Research alignment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Funding Likelihood</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl">{app.fundingLikelihood}%</div>
            <p className="text-xs text-muted-foreground mt-1">Based on profile</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requirements" className="space-y-6">
        <TabsList>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="supervisors">Supervisors</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="requirements">
          <Card>
            <CardHeader>
              <CardTitle>Application Requirements</CardTitle>
              <CardDescription>
                Track all requirements for this application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {app.requirements.map(req => (
                  <div
                    key={req.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className="mt-0.5">
                      {req.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm">{req.name}</h4>
                        {req.required && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                      {req.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {req.description}
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm">
                      {req.completed ? 'Undo' : 'Mark Complete'}
                    </Button>
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full mt-4">
                Add Requirement
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Application Documents</CardTitle>
              <CardDescription>
                Manage documents for this application
              </CardDescription>
            </CardHeader>
            <CardContent>
              {app.documents.length > 0 ? (
                <div className="space-y-3">
                  {app.documents.map(doc => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h4 className="text-sm">{doc.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {doc.type.toUpperCase()} • v{doc.version} • Uploaded{' '}
                            {formatDate(doc.uploadedDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                        <Button variant="ghost" size="sm">
                          Replace
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No documents uploaded yet
                </p>
              )}

              <Button variant="outline" className="w-full mt-4">
                Upload Document
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="supervisors">
          <Card>
            <CardHeader>
              <CardTitle>Potential Supervisors</CardTitle>
              <CardDescription>
                Track communications with faculty members
              </CardDescription>
            </CardHeader>
            <CardContent>
              {app.supervisors.length > 0 ? (
                <div className="space-y-4">
                  {app.supervisors.map(supervisor => (
                    <div
                      key={supervisor.id}
                      className="p-4 rounded-lg border border-border"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4>{supervisor.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {supervisor.department}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {supervisor.researchAreas.map((area, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Email:</span>
                          <a
                            href={`mailto:${supervisor.email}`}
                            className="text-primary hover:underline"
                          >
                            {supervisor.email}
                          </a>
                        </div>
                        {supervisor.publicationCount && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Publications:</span>
                            <span>{supervisor.publicationCount}</span>
                          </div>
                        )}
                        {supervisor.lastContacted && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Last Contacted:</span>
                            <span>{formatDate(supervisor.lastContacted)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Response:</span>
                          <Badge
                            variant={supervisor.responseReceived ? 'success' : 'outline'}
                          >
                            {supervisor.responseReceived ? 'Received' : 'Pending'}
                          </Badge>
                        </div>
                      </div>

                      {supervisor.notes && (
                        <div className="mt-3 p-3 rounded-md bg-muted text-sm">
                          {supervisor.notes}
                        </div>
                      )}

                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm">
                          <Mail className="h-4 w-4 mr-2" />
                          Send Email
                        </Button>
                        <Button variant="ghost" size="sm">
                          Edit Notes
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No supervisors added yet
                </p>
              )}

              <Button variant="outline" className="w-full mt-4">
                Add Supervisor
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Application Notes</CardTitle>
              <CardDescription>
                Keep track of important information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {app.notes ? (
                  <div className="p-4 rounded-lg border border-border bg-muted/50">
                    <div className="flex items-start gap-3">
                      <StickyNote className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <p className="text-sm flex-1">{app.notes}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No notes yet
                  </p>
                )}

                <Button variant="outline" className="w-full">
                  {app.notes ? 'Edit Notes' : 'Add Notes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Application Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current Status</p>
              <p className={`text-xl mt-1 capitalize ${getStatusColor(app.status)}`}>
                {app.status.replace('_', ' ')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">Update Status</Button>
              {app.status === 'ready_to_submit' && (
                <Button>Submit Application</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
