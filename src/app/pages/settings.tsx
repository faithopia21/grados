import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { ChevronDown, ChevronRight, Moon, Sun, User, GraduationCap, Award, Briefcase, BookOpen, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { mockUserProfile } from '../../data/mockData';
import { supabase } from '../../lib/supabase';

export function Settings() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('theme') === 'dark'
  );
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [emailReminders, setEmailReminders] = useState(true);
  const [weeklyProgress, setWeeklyProgress] = useState(false);

  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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

  useEffect(() => {
    const loadAccount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);
      setEmail(user.email ?? '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (profile?.full_name) {
        setFullName(profile.full_name);
      }
    };

    loadAccount();
  }, []);

  const handleSaveAccount = async () => {
    if (!userId) {
      toast.error('You must be signed in to save settings');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', userId);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Settings saved');
  };

  const handleChangePassword = async () => {
    setPasswordError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordSaving(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setPasswordSaving(false);

    if (error) {
      setPasswordError(error.message);
      return;
    }

    toast.success('Password updated');
    setIsPasswordModalOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleExportData = () => {
    toast.success('Exporting your data as CSV...');
  };

  const handleDeleteAccount = async () => {
    setIsDeleteModalOpen(false);
    await supabase.auth.signOut();
    toast.success('Your account deletion request has been received.');
    navigate('/signin');
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const toggleDarkMode = (checked: boolean) => {
    setDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/signin');
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1>Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account settings and preferences
          </p>
        </div>
        {/* Theme toggle for mobile/tablet */}
        <button
          onClick={() => toggleDarkMode(!darkMode)}
          className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="Toggle theme"
        >
          {darkMode ? (
            <Sun className="h-5 w-5 text-foreground" />
          ) : (
            <Moon className="h-5 w-5 text-foreground" />
          )}
        </button>
      </div>

      {/* Profile Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader
          className="cursor-pointer hover:bg-accent/50 transition-colors border-0"
          onClick={() => toggleSection('profile')}
        >
          <div className="flex items-center justify-between">
            <CardTitle>Profile</CardTitle>
            {expandedSection === 'profile' ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {expandedSection === 'profile' && (
          <CardContent className="space-y-6 pt-6">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Complete your profile once and reuse it across all applications
              </p>

              {/* Profile Completion Indicator */}
              <div className="space-y-2 mb-6">
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
                      <Label htmlFor="profileEmail">Email</Label>
                      <Input id="profileEmail" type="email" defaultValue={profile.personalInfo.email} />
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
          </CardContent>
        )}
      </Card>

      {/* Account Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader
          className="cursor-pointer hover:bg-accent/50 transition-colors border-0"
          onClick={() => toggleSection('account')}
        >
          <div className="flex items-center justify-between">
            <CardTitle>Account</CardTitle>
            {expandedSection === 'account' ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {expandedSection === 'account' && (
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
              />
              <p className="text-xs text-muted-foreground">
                Changing your email requires re-verification
              </p>
            </div>

            <Button onClick={handleSaveAccount}>Save</Button>

            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full border-[#DC2626] text-[#DC2626] hover:bg-red-50 hover:text-[#DC2626] dark:hover:bg-red-950/30"
            >
              Sign out of GradOS
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Security Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader
          className="cursor-pointer hover:bg-accent/50 transition-colors border-0"
          onClick={() => toggleSection('security')}
        >
          <div className="flex items-center justify-between">
            <CardTitle>Security</CardTitle>
            {expandedSection === 'security' ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {expandedSection === 'security' && (
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label>Password</Label>
              <Button
                variant="outline"
                onClick={() => setIsPasswordModalOpen(true)}
                style={{ color: '#4F46E5' }}
              >
                Change password
              </Button>
            </div>

          </CardContent>
        )}
      </Card>

      {/* Appearance Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader
          className="cursor-pointer hover:bg-accent/50 transition-colors border-0"
          onClick={() => toggleSection('appearance')}
        >
          <div className="flex items-center justify-between">
            <CardTitle>Appearance</CardTitle>
            {expandedSection === 'appearance' ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {expandedSection === 'appearance' && (
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="darkMode">Dark mode</Label>
                <p className="text-xs text-muted-foreground">
                  Enable dark theme for the entire application
                </p>
              </div>
              <Switch
                id="darkMode"
                checked={darkMode}
                onCheckedChange={toggleDarkMode}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Notifications Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader
          className="cursor-pointer hover:bg-accent/50 transition-colors border-0"
          onClick={() => toggleSection('notifications')}
        >
          <div className="flex items-center justify-between">
            <CardTitle>Notifications</CardTitle>
            {expandedSection === 'notifications' ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {expandedSection === 'notifications' && (
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="emailReminders">Email reminders for upcoming deadlines</Label>
              </div>
              <Switch
                id="emailReminders"
                checked={emailReminders}
                onCheckedChange={setEmailReminders}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="weeklyProgress">Weekly progress summary</Label>
              </div>
              <Switch
                id="weeklyProgress"
                checked={weeklyProgress}
                onCheckedChange={setWeeklyProgress}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Notification delivery coming soon.
            </p>
          </CardContent>
        )}
      </Card>

      {/* Data & Privacy Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader
          className="cursor-pointer hover:bg-accent/50 transition-colors border-0"
          onClick={() => toggleSection('privacy')}
        >
          <div className="flex items-center justify-between">
            <CardTitle>Data & Privacy</CardTitle>
            {expandedSection === 'privacy' ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {expandedSection === 'privacy' && (
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Export my data</Label>
                <p className="text-xs text-muted-foreground">
                  Download all your application data
                </p>
              </div>
              <Button variant="outline" onClick={handleExportData}>
                Export as CSV
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Delete my account</Label>
                <p className="text-xs text-muted-foreground">
                  Permanently delete your account and all data
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsDeleteModalOpen(true)}
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                Delete account
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* About Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader
          className="cursor-pointer hover:bg-accent/50 transition-colors border-0"
          onClick={() => toggleSection('about')}
        >
          <div className="flex items-center justify-between">
            <CardTitle>About</CardTitle>
            {expandedSection === 'about' ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {expandedSection === 'about' && (
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">App version</span>
              <span className="text-sm">GradOS MVP v1.0</span>
            </div>

            <div className="flex flex-col space-y-2 pt-2">
              <a
                href="#"
                className="text-sm hover:underline"
                style={{ color: '#4F46E5' }}
              >
                Terms of Service
              </a>
              <a
                href="#"
                className="text-sm hover:underline"
                style={{ color: '#4F46E5' }}
              >
                Privacy Policy
              </a>
              <a
                href="mailto:support@grados.app"
                className="text-sm hover:underline"
                style={{ color: '#4F46E5' }}
              >
                Contact support
              </a>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Change Password Modal */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {passwordError && (
              <p className="text-sm text-red-600" role="alert">
                {passwordError}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={passwordSaving}>
              {passwordSaving ? 'Updating...' : 'Update password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure? This will permanently delete all your data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
            >
              Yes, delete my account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
