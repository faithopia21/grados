import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { Skeleton } from '../components/ui/skeleton';
import { supabase } from '../../lib/supabase';
import { User, GraduationCap, Award, Briefcase, BookOpen, Plus, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileRow {
  id: string;
  full_name: string | null;
  nationality: string | null;
  current_institution: string | null;
  intended_degree: string | null;
  field_of_study: string | null;
  intended_start_term: string | null;
  gre_verbal: number | null;
  gre_quant: number | null;
  gre_awa: number | null;
}

interface ProfileFormData {
  fullName: string;
  nationality: string;
  currentInstitution: string;
  intendedDegree: string;
  fieldOfStudy: string;
  greVerbal: string;
  greQuant: string;
  greAwa: string;
}

const emptyForm: ProfileFormData = {
  fullName: '',
  nationality: '',
  currentInstitution: '',
  intendedDegree: '',
  fieldOfStudy: '',
  greVerbal: '',
  greQuant: '',
  greAwa: '',
};

function profileToForm(profile: ProfileRow | null): ProfileFormData {
  if (!profile) return emptyForm;
  return {
    fullName: profile.full_name ?? '',
    nationality: profile.nationality ?? '',
    currentInstitution: profile.current_institution ?? '',
    intendedDegree: profile.intended_degree ?? '',
    fieldOfStudy: profile.field_of_study ?? '',
    greVerbal: profile.gre_verbal != null ? String(profile.gre_verbal) : '',
    greQuant: profile.gre_quant != null ? String(profile.gre_quant) : '',
    greAwa: profile.gre_awa != null ? String(profile.gre_awa) : '',
  };
}

function parseGreScore(value: string): number | null {
  if (!value.trim()) return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function ProfileSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-10 w-full" />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    </div>
  );
}

export function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [formData, setFormData] = useState<ProfileFormData>(emptyForm);
  const [fetchError, setFetchError] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setFetchError('');

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setFetchError(userError?.message || 'Not signed in');
      setLoading(false);
      return;
    }

    setUserId(user.id);
    setEmail(user.email ?? '');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      setFetchError(profileError.message);
    } else if (profile) {
      setFormData(profileToForm(profile as ProfileRow));
    } else {
      setFormData(emptyForm);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const profileCompletion = useMemo(() => {
    let totalFields = 5;
    let completedFields = 0;
    if (formData.fullName.trim()) completedFields++;
    if (email.trim()) completedFields++;
    if (formData.nationality.trim()) completedFields++;
    if (formData.currentInstitution.trim()) completedFields++;
    if (formData.fieldOfStudy.trim()) completedFields++;
    return Math.round((completedFields / totalFields) * 100);
  }, [formData, email]);

  const handleChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.fullName.trim() || null,
        nationality: formData.nationality.trim() || null,
        current_institution: formData.currentInstitution.trim() || null,
        intended_degree: formData.intendedDegree.trim() || null,
        field_of_study: formData.fieldOfStudy.trim() || null,
        gre_verbal: parseGreScore(formData.greVerbal),
        gre_quant: parseGreScore(formData.greQuant),
        gre_awa: parseGreScore(formData.greAwa),
      })
      .eq('id', userId);

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Profile saved');
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1>Universal Profile</h1>
        <p className="text-muted-foreground mt-2">
          Complete your profile once and reuse it across all applications
        </p>
      </div>

      {fetchError && (
        <p className="text-sm text-red-600" role="alert">
          {fetchError}
        </p>
      )}

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
            <Progress value={profileCompletion} className="h-2">
              <div
                className="h-full transition-all rounded-full"
                style={{
                  width: `${profileCompletion}%`,
                  backgroundColor: '#1D9E75',
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
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={e => handleChange('fullName', e.target.value)}
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Email changes require re-verification and cannot be edited here.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality</Label>
                <Input
                  id="nationality"
                  value={formData.nationality}
                  onChange={e => handleChange('nationality', e.target.value)}
                  placeholder="Your nationality"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentInstitution">Current institution</Label>
                <Input
                  id="currentInstitution"
                  value={formData.currentInstitution}
                  onChange={e => handleChange('currentInstitution', e.target.value)}
                  placeholder="Where you study or work now"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="intendedDegree">Intended degree</Label>
                  <Input
                    id="intendedDegree"
                    value={formData.intendedDegree}
                    onChange={e => handleChange('intendedDegree', e.target.value)}
                    placeholder="e.g. PhD"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fieldOfStudy">Field of study</Label>
                  <Input
                    id="fieldOfStudy"
                    value={formData.fieldOfStudy}
                    onChange={e => handleChange('fieldOfStudy', e.target.value)}
                    placeholder="e.g. Computer Science"
                  />
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="education">
          <Card>
            <CardHeader>
              <CardTitle>Education</CardTitle>
              <CardDescription>Academic history for your applications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No education entries yet. Add your degrees from the profile fields above for now.
              </p>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests">
          <Card>
            <CardHeader>
              <CardTitle>Test Scores</CardTitle>
              <CardDescription>GRE and other standardized tests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="greVerbal">GRE Verbal</Label>
                  <Input
                    id="greVerbal"
                    type="number"
                    value={formData.greVerbal}
                    onChange={e => handleChange('greVerbal', e.target.value)}
                    placeholder="—"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="greQuant">GRE Quant</Label>
                  <Input
                    id="greQuant"
                    type="number"
                    value={formData.greQuant}
                    onChange={e => handleChange('greQuant', e.target.value)}
                    placeholder="—"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="greAwa">GRE AWA</Label>
                  <Input
                    id="greAwa"
                    type="number"
                    step="0.5"
                    value={formData.greAwa}
                    onChange={e => handleChange('greAwa', e.target.value)}
                    placeholder="—"
                  />
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="research">
          <Card>
            <CardHeader>
              <CardTitle>Research</CardTitle>
              <CardDescription>Publications and projects</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No publications or projects yet.
              </p>
              <Button variant="outline" className="w-full" disabled>
                <Plus className="h-4 w-4 mr-2" />
                Add Publication
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experience">
          <Card>
            <CardHeader>
              <CardTitle>Experience</CardTitle>
              <CardDescription>Work and research experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No experience entries yet.
              </p>
              <Button variant="outline" className="w-full" disabled>
                <Plus className="h-4 w-4 mr-2" />
                Add Experience
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
