import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { mockUserProfile } from '../../data/mockData';
import { User, GraduationCap, Award, Briefcase, BookOpen, Plus, Trash2, CheckCircle2 } from 'lucide-react';

export function Profile() {
  const [profile] = useState(mockUserProfile);

  // Calculate profile completion percentage
  const profileCompletion = useMemo(() => {
    let totalFields = 0;
    let completedFields = 0;

    // Personal info (5 fields)
    totalFields += 5;
    if (profile.personalInfo.firstName) completedFields++;
    if (profile.personalInfo.lastName) completedFields++;
    if (profile.personalInfo.email) completedFields++;
    if (profile.personalInfo.phone) completedFields++;
    if (profile.personalInfo.nationality) completedFields++;

    // Education (count if at least one entry)
    totalFields += 1;
    if (profile.education.length > 0) completedFields++;

    // Test scores (count if at least one entry)
    totalFields += 1;
    if (profile.testScores.length > 0) completedFields++;

    // Publications (count if at least one entry)
    totalFields += 1;
    if (profile.publications.length > 0) completedFields++;

    // Projects (count if at least one entry)
    totalFields += 1;
    if (profile.projects.length > 0) completedFields++;

    // Experience (count if at least one entry)
    totalFields += 1;
    if (profile.experience.length > 0) completedFields++;

    // Research interests
    totalFields += 1;
    if (profile.researchInterests.length > 0) completedFields++;

    return Math.round((completedFields / totalFields) * 100);
  }, [profile]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1>Universal Profile</h1>
        <p className="text-muted-foreground mt-2">
          Complete your profile once and reuse it across all applications
        </p>
      </div>

      {/* Profile Completion Indicator */}
      <div className="space-y-2">
        {profileCompletion === 100 ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: '#1D9E75' }}>
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">✓ Profile complete</span>
          </div>
        ) : (
          <>
            <p className="text-[13px] text-muted-foreground">
              Profile {profileCompletion}% complete — complete your profile to improve application matching
            </p>
            <Progress value={profileCompletion} className="h-2" style={{ '--tw-bg-opacity': '1', backgroundColor: 'rgb(241 245 249 / var(--tw-bg-opacity))' } as any}>
              <div
                className="h-full transition-all"
                style={{
                  width: `${profileCompletion}%`,
                  backgroundColor: '#1D9E75'
                }}
              />
            </Progress>
          </>
        )}
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-1">
          <TabsTrigger value="personal" className="text-xs md:text-sm">
            <User className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Personal</span>
          </TabsTrigger>
          <TabsTrigger value="education" className="text-xs md:text-sm">
            <GraduationCap className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Education</span>
          </TabsTrigger>
          <TabsTrigger value="tests" className="text-xs md:text-sm">
            <Award className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Tests</span>
          </TabsTrigger>
          <TabsTrigger value="research" className="text-xs md:text-sm">
            <BookOpen className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Research</span>
          </TabsTrigger>
          <TabsTrigger value="experience" className="text-xs md:text-sm">
            <Briefcase className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Experience</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Your basic information for applications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue={profile.personalInfo.firstName} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue={profile.personalInfo.lastName} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={profile.personalInfo.email} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" defaultValue={profile.personalInfo.phone} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality</Label>
                <Input id="nationality" defaultValue={profile.personalInfo.nationality} />
              </div>

              <div className="space-y-2">
                <Label>Research Interests</Label>
                <div className="flex flex-wrap gap-2 p-3 rounded-md border border-border bg-input-background min-h-[80px]">
                  {profile.researchInterests.map((interest, idx) => (
                    <Badge key={idx} variant="secondary">
                      {interest}
                      <button className="ml-2 hover:text-destructive">×</button>
                    </Badge>
                  ))}
                  <Button variant="ghost" size="sm" className="h-6">
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="education">
          <div className="space-y-4">
            {profile.education.map((edu, idx) => (
              <Card key={edu.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{edu.degree} in {edu.field}</CardTitle>
                      <CardDescription>{edu.institution}</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Institution</Label>
                      <Input defaultValue={edu.institution} />
                    </div>
                    <div className="space-y-2">
                      <Label>Degree</Label>
                      <Input defaultValue={edu.degree} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Field of Study</Label>
                    <Input defaultValue={edu.field} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input type="month" defaultValue={edu.startDate} />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input type="month" defaultValue={edu.endDate} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>GPA</Label>
                      <Input type="number" step="0.01" defaultValue={edu.gpa} />
                    </div>
                    <div className="space-y-2">
                      <Label>Max GPA</Label>
                      <Input type="number" step="0.01" defaultValue={edu.maxGpa} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Education
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="tests">
          <div className="space-y-4">
            {profile.testScores.map(test => (
              <Card key={test.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{test.type}</CardTitle>
                      <CardDescription>Score: {test.score} • Taken on {test.date}</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Test Type</Label>
                      <Input defaultValue={test.type} />
                    </div>
                    <div className="space-y-2">
                      <Label>Overall Score</Label>
                      <Input defaultValue={test.score} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Test Date</Label>
                    <Input type="date" defaultValue={test.date} />
                  </div>

                  {test.breakdown && (
                    <div className="space-y-2">
                      <Label>Score Breakdown</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(test.breakdown).map(([section, score]) => (
                          <div key={section} className="flex items-center justify-between p-2 rounded-md bg-muted">
                            <span className="text-sm capitalize">{section}</span>
                            <span className="text-sm">{score}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Test Score
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="research">
          <div className="space-y-6">
            <div className="space-y-4">
              <h3>Publications</h3>
              {profile.publications.map(pub => (
                <Card key={pub.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{pub.title}</CardTitle>
                        <CardDescription>
                          {pub.authors.join(', ')} • {pub.venue}, {pub.year}
                        </CardDescription>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {pub.citations && (
                      <div className="flex items-center gap-4 text-sm">
                        <Badge variant="outline">{pub.citations} citations</Badge>
                        {pub.doi && (
                          <a href={`https://doi.org/${pub.doi}`} className="text-primary hover:underline">
                            DOI: {pub.doi}
                          </a>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Publication
              </Button>
            </div>

            <div className="space-y-4">
              <h3>Projects</h3>
              {profile.projects.map(project => (
                <Card key={project.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{project.title}</CardTitle>
                        <CardDescription>{project.description}</CardDescription>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {project.technologies.map((tech, idx) => (
                        <Badge key={idx} variant="secondary">{tech}</Badge>
                      ))}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {project.startDate} - {project.endDate || 'Present'}
                    </div>
                    {project.link && (
                      <a href={project.link} className="text-sm text-primary hover:underline">
                        View Project →
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}

              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Project
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="experience">
          <div className="space-y-4">
            {profile.experience.map(exp => (
              <Card key={exp.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{exp.position}</CardTitle>
                      <CardDescription>
                        {exp.company} • {exp.location}
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    {exp.startDate} - {exp.endDate || 'Present'}
                  </div>
                  <p className="text-sm">{exp.description}</p>
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Experience
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
