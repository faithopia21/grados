import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Progress } from '../components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { ChevronDown, ChevronRight, CheckCircle2, ExternalLink, Mail, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../components/page-header';
import { exportApplicationsPDF } from '../../lib/export-pdf';
import { FAQModal } from '../components/faq-modal';

interface ProfileSummary {
  full_name: string | null;
  nationality: string | null;
  current_institution: string | null;
}

function getProfileCompletion(profile: ProfileSummary | null): number {
  if (!profile) return 0;
  const fields = [
    profile.full_name,
    profile.nationality,
    profile.current_institution,
  ];
  const filled = fields.filter(f => f != null && String(f).trim() !== '').length;
  return Math.round((filled / fields.length) * 100);
}

export function Settings() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(null);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [emailReminders, setEmailReminders] = useState(true);
  const [weeklyProgress, setWeeklyProgress] = useState(false);

  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false);
  const [clearDataLoading, setClearDataLoading] = useState(false);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);

  const profileCompletion = useMemo(
    () => getProfileCompletion(profileSummary),
    [profileSummary]
  );

  useEffect(() => {
    const loadAccount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);
      setEmail(user.email ?? '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, nationality, current_institution')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setProfileSummary(profile);
      } else {
        setProfileSummary({ full_name: '', nationality: '', current_institution: '' });
      }
    };

    loadAccount();
  }, []);

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

    toast.success('Password updated successfully');
    setIsPasswordModalOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleChangeEmail = async () => {
    setEmailError('');
    if (!newEmail.trim()) {
      setEmailError('Please enter a new email address');
      return;
    }

    setEmailSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setEmailSaving(false);

    if (error) {
      setEmailError(error.message);
      return;
    }

    toast.success('Check your new email for a confirmation link');
    setIsEmailModalOpen(false);
    setNewEmail('');
  };

  const handleExportData = async () => {
    if (!userId) return;
    
    const { data: programs } = await supabase
      .from('programs')
      .select('*')
      .eq('user_id', userId)
      .order('deadline', { ascending: true });

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();

    await exportApplicationsPDF(programs || [], profile);
    toast.success('PDF downloaded successfully');
  };

  const handleClearData = async () => {
    if (!userId) return;
    setClearDataLoading(true);

    try {
      const { data: programs } = await supabase
        .from('programs')
        .select('id')
        .eq('user_id', userId);

      if (programs && programs.length > 0) {
        const programIds = programs.map(p => p.id);
        await Promise.all([
          supabase.from('checklist_items').delete().in('program_id', programIds),
          supabase.from('program_notes').delete().in('program_id', programIds),
          supabase.from('recommenders').delete().in('program_id', programIds),
          supabase.from('portal_links').delete().in('program_id', programIds),
          supabase.from('program_documents').delete().in('program_id', programIds),
        ]);
        await supabase.from('programs').delete().eq('user_id', userId);
      }

      const { data: docs } = await supabase
        .from('documents')
        .select('storage_path, file_url')
        .eq('user_id', userId);

      if (docs && docs.length > 0) {
        const paths = docs
          .map(d => {
            if (d.storage_path) return d.storage_path;
            if (!d.file_url) return null;
            const marker = '/documents/';
            const idx = d.file_url.indexOf(marker);
            if (idx === -1) return null;
            return decodeURIComponent(d.file_url.slice(idx + marker.length).split('?')[0]);
          })
          .filter(Boolean) as string[];

        if (paths.length > 0) {
          await supabase.storage.from('documents').remove(paths);
        }
        await supabase.from('documents').delete().eq('user_id', userId);
      }

      toast.success('All application data cleared successfully.');
      setIsClearDataModalOpen(false);
      navigate('/dashboard');
    } catch (error: any) {
      toast.error('Failed to clear data: ' + error.message);
    } finally {
      setClearDataLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userId) return;
    
    setDeleteLoading(true);
    
    try {
      // Step 1: Mark profile for deletion
      // alter table profiles 
      // add column if not exists 
      // deletion_requested_at timestamptz;
      const { error: markError } = await supabase
        .from('profiles')
        .update({ 
          deletion_requested_at: new Date().toISOString() 
        })
        .eq('id', userId);
      
      if (markError) throw markError;
      
      // Step 2: Delete all user data
      // Delete programs and cascade
      const { data: programs } = await supabase
        .from('programs')
        .select('id')
        .eq('user_id', userId);
      
      if (programs && programs.length > 0) {
        const programIds = programs.map(p => p.id);
        
        await Promise.all([
          supabase.from('checklist_items').delete().in('program_id', programIds),
          supabase.from('program_notes').delete().in('program_id', programIds),
          supabase.from('recommenders').delete().in('program_id', programIds),
          supabase.from('portal_links').delete().in('program_id', programIds),
          supabase.from('program_documents').delete().in('program_id', programIds),
        ]);
        
        await supabase.from('programs').delete().eq('user_id', userId);
      }
      
      // Delete documents
      await supabase.from('documents').delete().eq('user_id', userId);
      
      // Delete profile
      await supabase.from('profiles').delete().eq('id', userId);
      
      // Step 3: Sign out
      await supabase.auth.signOut();
      
      // Step 4: Navigate to sign in with message
      setIsDeleteModalOpen(false);
      navigate('/signin?deleted=true');
      
    } catch (error: any) {
      toast.error('Failed to delete account: ' + error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/signin');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader 
        title="Settings"
        subtitle="Manage your account and preferences"
        backTo="/dashboard"
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">

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
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm text-muted-foreground">
              Complete your profile once and reuse it across all applications
            </p>

            <div className="space-y-2">
              {profileCompletion === 100 ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: '#1D9E75' }}>
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Profile complete</span>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Profile {profileCompletion}% complete
                  </p>
                  <Progress
                    value={profileCompletion}
                    className="h-2 [&_[data-slot=progress-indicator]]:bg-[#1D9E75]"
                  />
                </>
              )}
            </div>

            <Button onClick={() => navigate('/profile')} className="min-h-[44px]">
              Edit profile
            </Button>
          </CardContent>
        )}
      </Card>

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
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label>Email address</Label>
              <div>
                <Button
                  variant="outline"
                  onClick={() => setIsEmailModalOpen(true)}
                  className="w-full justify-start text-left font-normal"
                >
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="flex-1 truncate">{email}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-50" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Password</Label>
              <div>
                <Button
                  variant="outline"
                  onClick={() => setIsPasswordModalOpen(true)}
                  style={{ color: '#4F46E5' }}
                >
                  Change password
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="space-y-0.5 mb-3">
                <Label className="text-destructive">Delete my account</Label>
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
          <CardContent className="space-y-6 pt-6">
            <div>
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
              <p className="text-[11px] italic text-muted-foreground mt-1">
                Email reminders coming in a future update.
              </p>
            </div>

            <div>
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
              <p className="text-[11px] italic text-muted-foreground mt-1">
                Weekly summaries coming in a future update.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Export my data</Label>
                  <p className="text-xs text-muted-foreground">
                    Download all your application data
                  </p>
                </div>
                <Button variant="outline" onClick={handleExportData}>
                  Export as PDF
                </Button>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-destructive">Clear application data</Label>
                  <p className="text-xs text-muted-foreground">
                    Delete all uploaded documents and applications. Your profile will be kept.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setIsClearDataModalOpen(true)}
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  Clear Data
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader
          className="cursor-pointer hover:bg-accent/50 transition-colors border-0"
          onClick={() => toggleSection('help')}
        >
          <div className="flex items-center justify-between">
            <CardTitle>Help & Support</CardTitle>
            {expandedSection === 'help' ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {expandedSection === 'help' && (
          <CardContent className="space-y-6 pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <Label>Send feedback</Label>
                <p className="text-xs text-muted-foreground">
                  Help us improve GradOS
                </p>
              </div>
              <a
                href="https://forms.gle/Z3XPaAfByit73HDb8"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
              >
                Open feedback form
              </a>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <Label>Report a bug</Label>
                <p className="text-xs text-muted-foreground">
                  Something not working correctly?
                </p>
              </div>
              <a
                href="mailto:support@grados.app?subject=Bug Report - GradOS&body=Describe the bug here..."
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
              >
                Report a bug
              </a>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <Label>FAQs</Label>
                <p className="text-xs text-muted-foreground">
                  Common questions and how-tos
                </p>
              </div>
              <button
                onClick={() => setIsFaqModalOpen(true)}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
              >
                View FAQs
              </button>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label>About GradOS</Label>
                <p className="text-xs text-muted-foreground">
                  Built for graduate applicants worldwide.
                </p>
              </div>
              <span className="text-sm">MVP v1.0</span>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="border-t border-border pt-6 pb-8">
        <Button
          variant="outline"
          onClick={handleSignOut}
          className="w-full h-11 border-[#DC2626] text-[#DC2626] bg-transparent hover:bg-red-50 hover:text-[#DC2626] dark:hover:bg-red-950/30"
          style={{ height: 44 }}
        >
          Sign out of GradOS
        </Button>
      </div>

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
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
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

      {/* Email Change Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-x-4 top-[50%] z-50 grid w-full max-w-lg -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg sm:max-w-[425px] sm:rounded-lg md:inset-x-auto md:left-[50%] md:-translate-x-1/2">
            <div className="flex flex-col space-y-1.5 text-center sm:text-left">
              <h2 className="text-lg font-semibold leading-none tracking-tight">Change Email</h2>
              <p className="text-sm text-muted-foreground">
                Enter your new email address.
              </p>
            </div>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="new-email">New Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>

              {emailError && (
                <p className="text-sm text-red-600 font-medium">{emailError}</p>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsEmailModalOpen(false)}
                className="mt-2 sm:mt-0"
                disabled={emailSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleChangeEmail} disabled={emailSaving}>
                {emailSaving ? 'Saving...' : 'Update Email'}
              </Button>
            </div>
            <button
              onClick={() => setIsEmailModalOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>
        </div>
      )}


      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              This will permanently delete all your applications, documents, notes, and profile data. This cannot be undone. Your auth credentials will be removed from our system within 24 hours.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteLoading}>
              {deleteLoading ? 'Deleting...' : 'Yes, delete my account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isClearDataModalOpen} onOpenChange={setIsClearDataModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Clear All Data
            </DialogTitle>
            <DialogDescription className="pt-2">
              This action is <strong>irreversible</strong>. It will permanently delete all your applications, uploaded documents, notes, and preferences. Your profile and account will remain untouched.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsClearDataModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearData} disabled={clearDataLoading}>
              {clearDataLoading ? 'Clearing Data...' : 'Yes, clear all data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FAQModal open={isFaqModalOpen} onOpenChange={setIsFaqModalOpen} />
      </div>
    </div>
  );
}
