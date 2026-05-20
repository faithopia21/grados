import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Checkbox } from '../components/ui/checkbox';
import { Textarea } from '../components/ui/textarea';
import { DocumentStatusSelect } from '../components/document-status-select';
import { StatusUpdateDialog } from '../components/status-update-dialog';
import { useApplications } from '../../contexts/ApplicationContext';
import { getDaysUntil, formatDate } from '../../lib/utils';
import { DocumentStatus, ApplicationStatus, Note, Recommender, RecommenderStatus } from '../../types';
import { formatApplicationStatus, formatDocumentStatus } from '../../lib/status-utils';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  CheckCircle2,
  FileText,
  Users,
  StickyNote,
  TrendingUp,
  DollarSign,
  Mail,
  Upload,
  Link as LinkIcon,
  Globe,
  Plus,
  Trash2,
} from 'lucide-react';

export function SchoolWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedRecommenders, setExpandedRecommenders] = useState<Set<string>>(new Set());
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const { applications, universities, programs, updateApplication } = useApplications();

  const applicationData = useMemo(() => {
    const app = applications.find(a => a.id === id);
    if (!app) return null;

    const university = universities.find(u => u.id === app.universityId);
    const program = programs.find(p => p.id === app.programId);
    const daysUntil = getDaysUntil(app.deadline);
    const completedReqs = app.requirements.filter(r => r.completed).length;
    const totalReqs = app.requirements.length;

    return { app, university, program, daysUntil, completedReqs, totalReqs };
  }, [id, applications, universities, programs]);

  if (!applicationData) {
    return (
      <div className="p-8">
        <p>Application not found</p>
        <Button onClick={() => window.location.href = '/'}>
          Back to Dashboard
        </Button>
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
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/applications')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1>{university?.name}</h1>
            <Badge
              variant={program?.fundingAvailable ? 'success' : 'outline'}
              className="text-xs"
            >
              {program?.fundingAvailable ? 'Funding Available' : 'Self-Funded'}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {program?.degree} in {program?.name} • {program?.department}
          </p>
          <p className="text-sm text-muted-foreground">
            {university?.location ? `${university.location}, ` : ''}{university?.country}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsStatusDialogOpen(true)}
          >
            Update Status
          </Button>
          {app.portalLink && (
            <Button asChild>
              <a href={app.portalLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Portal
              </a>
            </Button>
          )}
        </div>

        <StatusUpdateDialog
          open={isStatusDialogOpen}
          onOpenChange={setIsStatusDialogOpen}
          currentStatus={app.status}
          onStatusChange={(status: ApplicationStatus) => {
            const updates: any = { status };
            if (status === 'submitted') {
              updates.submittedDate = new Date().toISOString().split('T')[0];
            }
            updateApplication(app.id, updates);
            toast.success(`Status updated to ${formatApplicationStatus(status)}`);
          }}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="w-max md:w-full">
            <TabsTrigger value="overview" className="text-xs md:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="requirements" className="text-xs md:text-sm">Requirements</TabsTrigger>
            <TabsTrigger value="recommendations" className="text-xs md:text-sm">Recommendations</TabsTrigger>
            <TabsTrigger value="documents" className="text-xs md:text-sm">Documents</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs md:text-sm">Notes</TabsTrigger>
            <TabsTrigger value="portal" className="text-xs md:text-sm">Portal</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Application Deadline</CardTitle>
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
                <CardTitle className="text-sm">Checklist Progress</CardTitle>
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
                <CardTitle className="text-sm">Application Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className="text-base px-3 py-1">
                  {formatApplicationStatus(app.status)}
                </Badge>
                {app.submittedDate && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Submitted {formatDate(app.submittedDate)}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Degree</span>
                  <span className="text-sm">{program?.degree}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Department</span>
                  <span className="text-sm">{program?.department}</span>
                </div>
                {program?.tuitionFee && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tuition (Annual)</span>
                    <span className="text-sm">${program.tuitionFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">University Ranking</span>
                  <span className="text-sm">#{university?.ranking}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Application Round</span>
                  <span className="text-sm">R1</span>
                </div>
                <p className="text-xs italic" style={{ color: '#888780' }}>
                  Tuition and ranking data is sourced automatically when you add a school. Verify on the university website before making decisions.
                </p>
              </CardContent>
            </Card>

            <Card>
            <CardHeader>
              <CardTitle>Checklist Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {app.requirements
                .filter(req => !req.completed)
                .slice(0, 3)
                .map(req => (
                  <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <Checkbox checked={false} disabled className="opacity-50" />
                      <span className="text-sm">{req.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Due {formatDate(app.deadline)}
                    </span>
                  </div>
                ))}
              {app.requirements.filter(req => !req.completed).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  All requirements completed!
                </p>
              )}
              <Button
                variant="link"
                className="w-full text-primary"
                onClick={() => setActiveTab('requirements')}
              >
                View full checklist →
              </Button>
            </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="requirements">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Requirements Checklist</CardTitle>
                  <CardDescription>
                    Track all requirements for this application
                  </CardDescription>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Progress:</span>{' '}
                  <span className="font-medium">
                    {completedReqs}/{totalReqs}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {completedReqs} of {totalReqs} requirements complete
                  </span>
                  <span className="font-medium">
                    {totalReqs > 0 ? Math.round((completedReqs / totalReqs) * 100) : 0}%
                  </span>
                </div>
                <Progress value={(completedReqs / totalReqs) * 100} className="h-2" />
              </div>

              {app.requirements.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="text-base mb-4">No requirements added yet</h3>
                  <div className="flex gap-3 justify-center">
                    <Button>Generate default checklist</Button>
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add item manually
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {app.requirements.map(req => (
                  <div
                    key={req.id}
                    className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      id={req.id}
                      checked={req.completed}
                      onCheckedChange={(checked) => {
                        const updatedReqs = app.requirements.map(r =>
                          r.id === req.id ? { ...r, completed: checked as boolean } : r
                        );
                        updateApplication(app.id, { requirements: updatedReqs });
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <label
                        htmlFor={req.id}
                        className="text-sm cursor-pointer flex items-center gap-2"
                      >
                        {req.name}
                        {req.required && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </label>
                      {req.description && (
                        <p className="text-sm text-muted-foreground">
                          {req.description}
                        </p>
                      )}
                      <DocumentStatusSelect
                        value={(req.status as DocumentStatus) || 'not_started'}
                        onChange={(status) => {
                          const updatedReqs = app.requirements.map(r =>
                            r.id === req.id
                              ? {
                                  ...r,
                                  status,
                                  completed: status === 'ready' || status === 'submitted' || status === 'not_required'
                                }
                              : r
                          );
                          updateApplication(app.id, { requirements: updatedReqs });
                          toast.success(`Status updated to ${formatDocumentStatus(status)}`);
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      {req.name.toLowerCase().includes('recommendation') ||
                       req.name.toLowerCase().includes('letter') ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTab('recommendations')}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Manage Recommenders
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        Notes
                      </Button>
                    </div>
                  </div>
                  ))}
                </div>
              )}

              {app.requirements.length > 0 && (
                <Button variant="outline" className="w-full mt-4">
                  Add Custom Requirement
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <div className="space-y-6">
            {(() => {
              const recommenders = app.recommenders || [];
              const confirmedCount = recommenders.filter(r => r.status === 'confirmed' || r.status === 'submitted').length;
              const submittedCount = recommenders.filter(r => r.status === 'submitted').length;
              const progressPercentage = recommenders.length > 0 ? (submittedCount / recommenders.length) * 100 : 0;

              const getStatusBorderColor = (status: RecommenderStatus) => {
                switch (status) {
                  case 'not_asked': return 'border-l-gray-400';
                  case 'asked': return 'border-l-yellow-500';
                  case 'confirmed': return 'border-l-blue-500';
                  case 'submitted': return 'border-l-green-500';
                  default: return 'border-l-gray-400';
                }
              };

              const handleAddRecommender = () => {
                if (recommenders.length >= 5) {
                  toast.error('Maximum 5 recommenders allowed');
                  return;
                }
                const newRecommender: Recommender = {
                  id: `rec-${Date.now()}`,
                  name: '',
                  title: '',
                  email: '',
                  status: 'not_asked',
                  briefingNotes: '',
                };
                updateApplication(app.id, { recommenders: [...recommenders, newRecommender] });
              };

              const handleUpdateRecommender = (id: string, updates: Partial<Recommender>) => {
                const updatedRecommenders = recommenders.map(r =>
                  r.id === id ? { ...r, ...updates } : r
                );
                updateApplication(app.id, { recommenders: updatedRecommenders });
              };

              const handleDeleteRecommender = (id: string) => {
                const updatedRecommenders = recommenders.filter(r => r.id !== id);
                updateApplication(app.id, { recommenders: updatedRecommenders });
                setExpandedRecommenders(prev => {
                  const next = new Set(prev);
                  next.delete(id);
                  return next;
                });
              };

              const toggleExpanded = (id: string) => {
                setExpandedRecommenders(prev => {
                  const next = new Set(prev);
                  if (next.has(id)) {
                    next.delete(id);
                  } else {
                    next.add(id);
                  }
                  return next;
                });
              };

              return (
                <>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Recommenders</CardTitle>
                          <CardDescription>Manage your letter of recommendation requests (max 5)</CardDescription>
                        </div>
                        <Button size="sm" onClick={handleAddRecommender} disabled={recommenders.length >= 5}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Recommender
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {recommenders.length === 0 ? (
                        <div className="text-center py-12">
                          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-sm text-muted-foreground mb-4">
                            No recommenders added yet
                          </p>
                          <Button onClick={handleAddRecommender}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Your First Recommender
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {recommenders.map((rec) => {
                            const isExpanded = expandedRecommenders.has(rec.id);
                            return (
                              <Card
                                key={rec.id}
                                className={`border-l-[3px] ${getStatusBorderColor(rec.status)} transition-colors`}
                              >
                                <CardContent className="pt-6">
                                  <div className="space-y-4">
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                          <label className="text-xs text-muted-foreground">Name</label>
                                          <input
                                            type="text"
                                            value={rec.name}
                                            onChange={(e) => handleUpdateRecommender(rec.id, { name: e.target.value })}
                                            placeholder="Enter name"
                                            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-xs text-muted-foreground">Title</label>
                                          <input
                                            type="text"
                                            value={rec.title}
                                            onChange={(e) => handleUpdateRecommender(rec.id, { title: e.target.value })}
                                            placeholder="e.g., Professor, Manager"
                                            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-xs text-muted-foreground">Email</label>
                                          <input
                                            type="email"
                                            value={rec.email}
                                            onChange={(e) => handleUpdateRecommender(rec.id, { email: e.target.value })}
                                            placeholder="email@example.com"
                                            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <select
                                          value={rec.status}
                                          onChange={(e) => handleUpdateRecommender(rec.id, { status: e.target.value as RecommenderStatus })}
                                          className="px-3 py-2 text-sm border border-border rounded-md bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                                        >
                                          <option value="not_asked">Not Asked</option>
                                          <option value="asked">Asked</option>
                                          <option value="confirmed">Confirmed</option>
                                          <option value="submitted">Submitted</option>
                                        </select>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            if (confirm('Are you sure you want to delete this recommender?')) {
                                              handleDeleteRecommender(rec.id);
                                              toast.success('Recommender removed');
                                            }
                                          }}
                                          title="Delete recommender"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => toggleExpanded(rec.id)}
                                        >
                                          {isExpanded ? '−' : '+'}
                                        </Button>
                                      </div>
                                    </div>

                                    {isExpanded && (
                                      <div className="space-y-3 pt-3 border-t border-border">
                                        <div className="space-y-2">
                                          <label className="text-xs text-muted-foreground">Briefing Notes</label>
                                          <Textarea
                                            value={rec.briefingNotes || ''}
                                            onChange={(e) => handleUpdateRecommender(rec.id, { briefingNotes: e.target.value })}
                                            placeholder="Enter talking points and context to share with this recommender..."
                                            className="min-h-[120px] resize-none whitespace-pre-wrap break-words"
                                          />
                                        </div>
                                        <div className="flex justify-start">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              navigator.clipboard.writeText(rec.briefingNotes || '');
                                              toast.success('Briefing notes copied to clipboard');
                                            }}
                                          >
                                            Copy Notes
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Application Documents</CardTitle>
                    <CardDescription>
                      Manage all documents for this application
                    </CardDescription>
                  </div>
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload New
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {app.documents.length > 0 ? (
                  <div className="space-y-3">
                    {app.documents.map(doc => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <h4 className="text-sm">{doc.name}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {doc.type.toUpperCase()} • Version {doc.version} • Uploaded{' '}
                              {formatDate(doc.uploadedDate)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Used in 1 app
                          </Badge>
                          <Button variant="ghost" size="sm">
                            Download
                          </Button>
                          <Button variant="ghost" size="sm">
                            Replace
                          </Button>
                          <Button variant="ghost" size="sm">
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">
                      No documents uploaded yet
                    </p>
                    <Button variant="outline" className="mt-4">
                      Upload Your First Document
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reuse from Other Schools</CardTitle>
                <CardDescription>
                  Import documents from other applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Browse Document Library
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notes">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add Note</CardTitle>
                <CardDescription>
                  Track ideas, reminders, professor contacts, and important details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Write your note here..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <Button
                  onClick={() => {
                    if (!newNoteContent.trim()) {
                      toast.error('Please enter some content for the note');
                      return;
                    }

                    const currentNotes = app.notesArray || [];
                    const newNote: Note = {
                      id: `note-${Date.now()}`,
                      content: newNoteContent,
                      timestamp: new Date().toISOString(),
                    };

                    updateApplication(app.id, {
                      notesArray: [newNote, ...currentNotes],
                    });

                    setNewNoteContent('');
                    toast.success('Note added');
                  }}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </CardContent>
            </Card>

            {app.notesArray && app.notesArray.length > 0 && (
              <div className="space-y-3">
                {app.notesArray.map((note) => (
                  <Card key={note.id}>
                    <CardContent className="p-4">
                      {editingNoteId === note.id ? (
                        <div className="space-y-3">
                          <Textarea
                            value={editingNoteContent}
                            onChange={(e) => setEditingNoteContent(e.target.value)}
                            className="min-h-[100px] resize-none"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                if (!editingNoteContent.trim()) {
                                  toast.error('Note cannot be empty');
                                  return;
                                }
                                const updatedNotes = app.notesArray?.map(n =>
                                  n.id === note.id ? { ...n, content: editingNoteContent } : n
                                ) || [];
                                updateApplication(app.id, {
                                  notesArray: updatedNotes,
                                });
                                setEditingNoteId(null);
                                setEditingNoteContent('');
                                toast.success('Note updated');
                              }}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingNoteId(null);
                                setEditingNoteContent('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(note.timestamp).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditingNoteContent(note.content);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const updatedNotes = app.notesArray?.filter(n => n.id !== note.id) || [];
                                updateApplication(app.id, {
                                  notesArray: updatedNotes,
                                });
                                toast.success('Note deleted');
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {(!app.notesArray || app.notesArray.length === 0) && (
              <Card>
                <CardContent className="py-12 text-center">
                  <StickyNote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No notes yet. Add your first note above.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="portal">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Application Portal Access</CardTitle>
                <CardDescription>
                  Your bookmark replacement - all important links in one place
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {app.portalLink && (
                  <a
                    href={app.portalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full justify-start h-auto py-4" size="lg">
                      <ExternalLink className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <div>Application Portal</div>
                        <div className="text-xs opacity-80 font-normal mt-0.5">
                          {app.portalLink}
                        </div>
                      </div>
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Saved Links</CardTitle>
                <CardDescription>Quick access to important pages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm">Department Page</p>
                      <p className="text-xs text-muted-foreground">Program information</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm">Funding Page</p>
                      <p className="text-xs text-muted-foreground">
                        Scholarships and assistantships
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm">Faculty Directory</p>
                      <p className="text-xs text-muted-foreground">Find potential supervisors</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </div>
                </div>

                <Button variant="outline" className="w-full">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Add New Link
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
