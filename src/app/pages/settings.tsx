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
import { ChevronDown, ChevronRight, CheckCircle2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../components/page-header';
import { exportApplicationsPDF } from '../../lib/export-pdf';

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

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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

    toast.success('Password updated');
    setIsPasswordModalOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
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

  const handleDeleteAccount = async () => {
    setIsDeleteModalOpen(false);
    await supabase.auth.signOut();
    toast.success('Your account deletion request has been received.');
    navigate('/signin');
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
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                readOnly
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Email is managed through your sign-in provider
              </p>
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
                href="https://forms.google.com"
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
              <a
                href="https://grados.app/help"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
              >
                View FAQs
              </a>
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
            <Button variant="destructive" onClick={handleDeleteAccount}>
              Yes, delete my account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
