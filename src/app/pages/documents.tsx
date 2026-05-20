import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useApplications } from '../../contexts/ApplicationContext';
import { formatDate } from '../../lib/utils';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  FileCheck,
  FileEdit,
  Search,
  Plus,
  Copy,
} from 'lucide-react';
import { Input } from '../components/ui/input';

export function Documents() {
  const [searchQuery, setSearchQuery] = useState('');
  const { applications, universities } = useApplications();

  const allDocuments = applications.flatMap(app => {
    const university = universities.find(u => u.id === app.universityId);
    return app.documents.map(doc => ({
      ...doc,
      applicationId: app.id,
      universityName: university?.name || 'Unknown',
    }));
  });

  const sopDocuments = allDocuments.filter(d => d.type === 'sop');
  const cvDocuments = allDocuments.filter(d => d.type === 'cv');
  const otherDocuments = allDocuments.filter(d => !['sop', 'cv'].includes(d.type));

  const documentsByType = {
    sop: sopDocuments,
    cv: cvDocuments,
    transcript: allDocuments.filter(d => d.type === 'transcript'),
    recommendation: allDocuments.filter(d => d.type === 'recommendation'),
    other: otherDocuments,
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1>Documents Hub</h1>
          <p className="text-muted-foreground mt-2">
            Centralized library for all your application documents
          </p>
        </div>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Upload New Document
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <p className="text-xs text-muted-foreground">2.1 MB of 200 MB used</p>
        </div>
        <div className="w-full">
          <Progress value={1.05} className="h-1.5" style={{ backgroundColor: '#F1F5F9' }} />
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">
            All Documents ({allDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="sop">
            SOP Library ({documentsByType.sop.length})
          </TabsTrigger>
          <TabsTrigger value="cv">
            CV Library ({documentsByType.cv.length})
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            Recommendations ({documentsByType.recommendation.length})
          </TabsTrigger>
          <TabsTrigger value="other">
            Other ({documentsByType.other.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Documents</CardTitle>
              <CardDescription>Complete library of application documents</CardDescription>
            </CardHeader>
            <CardContent>
              {allDocuments.length > 0 ? (
                <div className="space-y-3">
                  {allDocuments.map(doc => (
                    <div
                      key={doc.id}
                      className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm">{doc.name}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {doc.type.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Version {doc.version}
                            </span>
                            <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
                            <span className="text-xs text-muted-foreground">
                              Used in {doc.universityName}
                            </span>
                            <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(doc.uploadedDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end md:self-auto">
                        <Button variant="ghost" size="sm" title="Use in another application">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Download">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mb-6">
                    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
                      <rect x="12" y="4" width="32" height="48" rx="4" stroke="#C7D2FE" strokeWidth="2" strokeDasharray="4 4" fill="#EEF2FF" />
                      <path d="M28 20v16m-8-8h16" stroke="#C7D2FE" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <h3 className="text-base mb-2">No documents yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload your SOP, CV, transcripts, and other documents once — then attach them to any application.
                  </p>
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload your first document
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3">
                    PDF, DOCX, TXT · Max 25 MB per file
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sop">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Statement of Purpose Library</CardTitle>
                <CardDescription>
                  Manage different versions of your SOP for various applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sopDocuments.length > 0 ? (
                  <div className="space-y-3">
                    {sopDocuments.map(doc => (
                      <div
                        key={doc.id}
                        className="p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="text-sm">{doc.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              For {doc.universityName} • Version {doc.version}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Uploaded {formatDate(doc.uploadedDate)}
                            </p>
                          </div>
                          <Badge variant="success" className="text-xs">
                            <FileCheck className="h-3 w-3 mr-1" />
                            Ready
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <FileEdit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm">
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                          <Button variant="ghost" size="sm">
                            Use in Application
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground mb-4">
                      No SOP documents yet
                    </p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Master SOP
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SOP Variations</CardTitle>
                <CardDescription>
                  Adapt your master SOP for different programs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create SOP Variation
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cv">
          <Card>
            <CardHeader>
              <CardTitle>CV/Resume Library</CardTitle>
              <CardDescription>
                Different versions of your CV tailored for specific programs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cvDocuments.length > 0 ? (
                <div className="space-y-3">
                  {cvDocuments.map(doc => (
                    <div
                      key={doc.id}
                      className="p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="text-sm">{doc.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            Version {doc.version} • {formatDate(doc.uploadedDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <FileEdit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">No CV documents yet</p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Master CV
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle>Letters of Recommendation</CardTitle>
              <CardDescription>Track recommendation letters and requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  No recommendation letters yet
                </p>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Recommender
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="other">
          <Card>
            <CardHeader>
              <CardTitle>Other Documents</CardTitle>
              <CardDescription>
                Transcripts, test scores, portfolios, and miscellaneous files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  No additional documents yet
                </p>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
