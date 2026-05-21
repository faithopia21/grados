import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { AutocompleteInput } from '../components/autocomplete-input';
import { supabase } from '../../lib/supabase';
import { COUNTRIES } from '../../data/countries';
import { User, GraduationCap, Award, Briefcase, BookOpen, Plus, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';

export interface ProfileRow {
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
  toefl_score: number | null;
  ielts_score: number | null;
  gmat_score: number | null;
  research_interests: string | null;
  experience: string | null;
  education: string | null;
}

function parseGreScore(value: string): number | null {
  if (!value.trim()) return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function parseIntScore(value: string): number | null {
  if (!value.trim()) return null;
  const num = parseInt(value, 10);
  return Number.isNaN(num) ? null : num;
}

function parseDecimalScore(value: string): number | null {
  if (!value.trim()) return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function parseResearchInterests(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((t): t is string => typeof t === 'string');
    }
  } catch {
    // ignore
  }
  return [];
}

function getCompletionPercent(profile: ProfileRow): number {
  const filledFields = [
    profile.full_name,
    profile.nationality,
    profile.current_institution,
    profile.intended_degree,
    profile.field_of_study,
    profile.intended_start_term,
  ].filter(f => f != null && String(f).trim() !== '').length;
  return Math.round((filledFields / 6) * 100);
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
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    </div>
  );
}

interface ProfileFormProps {
  profile: ProfileRow;
  email: string;
  onProfileUpdated: (profile: ProfileRow) => void;
}

function ProfileForm({ profile, email, onProfileUpdated }: ProfileFormProps) {
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [nationality, setNationality] = useState(profile.nationality || '');
  const [currentInstitution, setCurrentInstitution] = useState(
    profile.current_institution || ''
  );
  const [intendedDegree, setIntendedDegree] = useState(profile.intended_degree || '');
  const [fieldOfStudy, setFieldOfStudy] = useState(profile.field_of_study || '');
  const [intendedStartTerm, setIntendedStartTerm] = useState(
    profile.intended_start_term || ''
  );

  const [greVerbal, setGreVerbal] = useState(
    profile.gre_verbal != null ? String(profile.gre_verbal) : ''
  );
  const [greQuant, setGreQuant] = useState(
    profile.gre_quant != null ? String(profile.gre_quant) : ''
  );
  const [greAwa, setGreAwa] = useState(
    profile.gre_awa != null ? String(profile.gre_awa) : ''
  );
  const [toeflScore, setToeflScore] = useState(
    profile.toefl_score != null ? String(profile.toefl_score) : ''
  );
  const [ieltsScore, setIeltsScore] = useState(
    profile.ielts_score != null ? String(profile.ielts_score) : ''
  );
  const [gmatScore, setGmatScore] = useState(
    profile.gmat_score != null ? String(profile.gmat_score) : ''
  );

  const [interestTags, setInterestTags] = useState<string[]>(
    parseResearchInterests(profile.research_interests)
  );
  const [newInterest, setNewInterest] = useState('');
  const [experience, setExperience] = useState(profile.experience || '');
  const [education, setEducation] = useState(profile.education || '');

  const [savingTab, setSavingTab] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');

  const [localProfile, setLocalProfile] = useState(profile);

  useEffect(() => {
    setFullName(profile.full_name || '');
    setNationality(profile.nationality || '');
    setCurrentInstitution(profile.current_institution || '');
    setIntendedDegree(profile.intended_degree || '');
    setFieldOfStudy(profile.field_of_study || '');
    setIntendedStartTerm(profile.intended_start_term || '');
    setGreVerbal(profile.gre_verbal != null ? String(profile.gre_verbal) : '');
    setGreQuant(profile.gre_quant != null ? String(profile.gre_quant) : '');
    setGreAwa(profile.gre_awa != null ? String(profile.gre_awa) : '');
    setToeflScore(profile.toefl_score != null ? String(profile.toefl_score) : '');
    setIeltsScore(profile.ielts_score != null ? String(profile.ielts_score) : '');
    setGmatScore(profile.gmat_score != null ? String(profile.gmat_score) : '');
    setInterestTags(parseResearchInterests(profile.research_interests));
    setExperience(profile.experience || '');
    setEducation(profile.education || '');
    setLocalProfile(profile);
  }, [profile]);

  const profileCompletion = useMemo(
    () => getCompletionPercent(localProfile),
    [localProfile]
  );

  const nationalityOptions = useMemo(() => {
    const q = nationality.trim();
    if (!q) return [];
    return COUNTRIES.filter(c => c.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 5)
      .map(c => ({ value: c, label: c }));
  }, [nationality]);

  const saveProfile = async (
    tab: string,
    updates: Record<string, unknown>
  ): Promise<boolean> => {
    setSavingTab(tab);
    setSaveError('');

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)
      .select('*')
      .single();

    setSavingTab(null);

    if (error) {
      setSaveError(error.message);
      return false;
    }

    const updated = data as ProfileRow;
    setLocalProfile(updated);
    onProfileUpdated(updated);
    toast.success('Profile saved');
    return true;
  };

  const handleSavePersonal = async () => {
    await saveProfile('personal', {
      full_name: fullName.trim() || null,
      nationality: nationality.trim() || null,
      current_institution: currentInstitution.trim() || null,
      intended_degree: intendedDegree.trim() || null,
      field_of_study: fieldOfStudy.trim() || null,
      intended_start_term: intendedStartTerm.trim() || null,
    });
  };

  const handleSaveTests = async () => {
    await saveProfile('tests', {
      gre_verbal: parseGreScore(greVerbal),
      gre_quant: parseGreScore(greQuant),
      gre_awa: parseGreScore(greAwa),
      toefl_score: parseIntScore(toeflScore),
      ielts_score: parseDecimalScore(ieltsScore),
      gmat_score: parseIntScore(gmatScore),
    });
  };

  const handleSaveResearch = async () => {
    await saveProfile('research', {
      research_interests: JSON.stringify(interestTags),
    });
  };

  const handleSaveExperience = async () => {
    await saveProfile('experience', {
      experience: experience.trim() || null,
    });
  };

  const handleSaveEducation = async () => {
    await saveProfile('education', {
      education: education.trim() || null,
    });
  };

  const addInterest = () => {
    const tag = newInterest.trim();
    if (!tag || interestTags.includes(tag)) return;
    setInterestTags(prev => [...prev, tag]);
    setNewInterest('');
  };

  const removeInterest = (tag: string) => {
    setInterestTags(prev => prev.filter(t => t !== tag));
  };

  return (
    <>
      {saveError && (
        <p className="text-sm text-red-600" role="alert">
          {saveError}
        </p>
      )}

      <div className="space-y-2">
        {profileCompletion === 100 ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: '#1D9E75' }}>
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">Profile complete</span>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium">{profileCompletion}% complete</p>
            <Progress
              value={profileCompletion}
              className="h-2 [&_[data-slot=progress-indicator]]:bg-[#4F46E5]"
            />
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
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality</Label>
                <AutocompleteInput
                  id="nationality"
                  value={nationality}
                  onChange={setNationality}
                  options={nationalityOptions}
                  placeholder="Your nationality"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentInstitution">Current institution</Label>
                <Input
                  id="currentInstitution"
                  value={currentInstitution}
                  onChange={e => setCurrentInstitution(e.target.value)}
                  placeholder="Where you study or work now"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="intendedDegree">Intended degree</Label>
                  <Input
                    id="intendedDegree"
                    value={intendedDegree}
                    onChange={e => setIntendedDegree(e.target.value)}
                    placeholder="e.g. PhD"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fieldOfStudy">Field of study</Label>
                  <Input
                    id="fieldOfStudy"
                    value={fieldOfStudy}
                    onChange={e => setFieldOfStudy(e.target.value)}
                    placeholder="e.g. Computer Science"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="intendedStartTerm">Intended start term</Label>
                <Input
                  id="intendedStartTerm"
                  value={intendedStartTerm}
                  onChange={e => setIntendedStartTerm(e.target.value)}
                  placeholder="e.g. Fall 2026"
                />
              </div>

              <Button
                onClick={handleSavePersonal}
                disabled={savingTab === 'personal'}
                className="min-h-[44px]"
              >
                {savingTab === 'personal' ? 'Saving...' : 'Save Changes'}
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
              <div className="space-y-2">
                <Label htmlFor="education">Education history</Label>
                <Textarea
                  id="education"
                  value={education}
                  onChange={e => setEducation(e.target.value)}
                  placeholder="List your degrees, institutions, graduation dates, GPAs..."
                  rows={8}
                  className="resize-y"
                />
              </div>
              <Button
                onClick={handleSaveEducation}
                disabled={savingTab === 'education'}
                className="min-h-[44px]"
              >
                {savingTab === 'education' ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests">
          <Card>
            <CardHeader>
              <CardTitle>Test Scores</CardTitle>
              <CardDescription>GRE, TOEFL, IELTS, and GMAT scores</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="greVerbal">GRE Verbal</Label>
                  <Input
                    id="greVerbal"
                    type="number"
                    value={greVerbal}
                    onChange={e => setGreVerbal(e.target.value)}
                    placeholder="—"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="greQuant">GRE Quant</Label>
                  <Input
                    id="greQuant"
                    type="number"
                    value={greQuant}
                    onChange={e => setGreQuant(e.target.value)}
                    placeholder="—"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="greAwa">GRE AWA</Label>
                  <Input
                    id="greAwa"
                    type="number"
                    step="0.5"
                    value={greAwa}
                    onChange={e => setGreAwa(e.target.value)}
                    placeholder="—"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="toeflScore">TOEFL</Label>
                  <Input
                    id="toeflScore"
                    type="number"
                    value={toeflScore}
                    onChange={e => setToeflScore(e.target.value)}
                    placeholder="—"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ieltsScore">IELTS</Label>
                  <Input
                    id="ieltsScore"
                    type="number"
                    step="0.5"
                    value={ieltsScore}
                    onChange={e => setIeltsScore(e.target.value)}
                    placeholder="—"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gmatScore">GMAT</Label>
                  <Input
                    id="gmatScore"
                    type="number"
                    value={gmatScore}
                    onChange={e => setGmatScore(e.target.value)}
                    placeholder="—"
                  />
                </div>
              </div>
              <Button
                onClick={handleSaveTests}
                disabled={savingTab === 'tests'}
                className="min-h-[44px]"
              >
                {savingTab === 'tests' ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="research">
          <Card>
            <CardHeader>
              <CardTitle>Research Interests</CardTitle>
              <CardDescription>Topics and areas you want to study</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 min-h-[40px] p-3 rounded-md border border-border">
                {interestTags.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No interests added yet</span>
                ) : (
                  interestTags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeInterest(tag)}
                        className="ml-1 hover:text-destructive"
                        aria-label={`Remove ${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newInterest}
                  onChange={e => setNewInterest(e.target.value)}
                  placeholder="Add a research interest"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addInterest();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addInterest}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button
                onClick={handleSaveResearch}
                disabled={savingTab === 'research'}
                className="min-h-[44px]"
              >
                {savingTab === 'research' ? 'Saving...' : 'Save Changes'}
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
              <div className="space-y-2">
                <Label htmlFor="experience">Experience</Label>
                <Textarea
                  id="experience"
                  value={experience}
                  onChange={e => setExperience(e.target.value)}
                  placeholder="Describe your work experience, internships, research roles..."
                  rows={8}
                  className="resize-y"
                />
              </div>
              <Button
                onClick={handleSaveExperience}
                disabled={savingTab === 'experience'}
                className="min-h-[44px]"
              >
                {savingTab === 'experience' ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

export function Profile() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [email, setEmail] = useState('');
  const [fetchError, setFetchError] = useState('');

  const fetchProfile = useCallback(async () => {
    setFetchError('');

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setFetchError(userError?.message || 'Not signed in');
      return null;
    }

    setEmail(user.email ?? '');

    let { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      setFetchError(profileError.message);
      return null;
    }

    if (!profileData) {
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({ id: user.id });

      if (upsertError) {
        setFetchError(upsertError.message);
        return null;
      }

      const refetch = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (refetch.error) {
        setFetchError(refetch.error.message);
        return null;
      }

      profileData = refetch.data;
    }

    return profileData as ProfileRow;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const data = await fetchProfile();
      if (!cancelled) {
        setProfile(data);
        setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [fetchProfile]);

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (fetchError) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-sm text-red-600" role="alert">
          {fetchError}
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-sm text-muted-foreground">Could not load profile.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-muted-foreground mt-2">
          Complete your profile once and reuse it across all applications
        </p>
      </div>

      <ProfileForm
        profile={profile}
        email={email}
        onProfileUpdated={setProfile}
      />
    </div>
  );
}
