import { useState, useEffect, useMemo } from 'react';
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
import { RESEARCH_INTERESTS } from '../../data/researchInterests';
import { cn } from '../../lib/utils';
import {
  User,
  GraduationCap,
  Award,
  Briefcase,
  BookOpen,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { PageSkeleton } from '../components/page-skeleton';
import { toast } from 'sonner';
import { PageHeader } from '../components/page-header';

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
  research_domain: string | null;
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

function parseJsonArray(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((t): t is string => typeof t === 'string');
    }
  } catch {
    // ignore invalid JSON
  }
  return [];
}

/** Given a list of subfields, return the parent domain names that have ≥1 match. */
function deriveDomains(subfields: string[]): string[] {
  if (!subfields.length) return [];
  return RESEARCH_INTERESTS
    .filter(d => d.subfields.some(s => subfields.includes(s)))
    .map(d => d.domain);
}

function getCompletionPercent(profile: ProfileRow): number {
  const educationData = profile?.education
    ? (() => {
        try {
          return JSON.parse(profile.education)
        } catch {
          return null
        }
      })()
    : null;

  const hasEducation = !!(
    educationData?.institution && 
    educationData?.degree
  );

  const filledFields = [
    profile?.full_name,
    profile?.nationality,
    profile?.current_institution,
    profile?.intended_degree,
    profile?.field_of_study,
    profile?.intended_start_term,
    hasEducation ? 'filled' : null,
  ].filter(f => f != null && String(f).trim() !== '').length;

  return Math.round((filledFields / 7) * 100);
}

function getProfileInitials(fullName: string | null, email: string): string {
  if (fullName?.trim()) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return fullName.trim().slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'G';
}

function generateTermOptions(): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const terms: string[] = [];
  const startYear = currentYear;
  const startWithSpring = currentMonth >= 8;
  for (let i = 0; i < 3; i++) {
    const year = startYear + i;
    if (startWithSpring || i > 0) {
      terms.push(`Spring ${year + 1}`);
    }
    terms.push(`Fall ${year + 1}`);
    terms.push(`Summer ${year + 1}`);
  }
  return terms;
}

const TERM_OPTIONS = generateTermOptions();

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

interface ProfilePageContentProps {
  profile: ProfileRow;
  email: string;
  onProfileUpdated: (profile: ProfileRow) => void;
}

function ProfilePageContent({ profile, email, onProfileUpdated }: ProfilePageContentProps) {
  // ── Personal ──────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [nationality, setNationality] = useState(profile.nationality ?? '');
  const [currentInstitution, setCurrentInstitution] = useState(profile.current_institution ?? '');
  const [intendedDegree, setIntendedDegree] = useState(profile.intended_degree ?? '');
  const [fieldOfStudy, setFieldOfStudy] = useState(profile.field_of_study ?? '');
  const [intendedStartTerm, setIntendedStartTerm] = useState(profile.intended_start_term ?? '');

  // ── Tests ─────────────────────────────────────────────────────────────
  const [greVerbal, setGreVerbal] = useState(profile.gre_verbal?.toString() ?? '');
  const [greQuant, setGreQuant] = useState(profile.gre_quant?.toString() ?? '');
  const [greAwa, setGreAwa] = useState(profile.gre_awa?.toString() ?? '');
  const [toeflScore, setToeflScore] = useState(profile.toefl_score?.toString() ?? '');
  const [ieltsScore, setIeltsScore] = useState(profile.ielts_score?.toString() ?? '');
  const [gmatScore, setGmatScore] = useState(profile.gmat_score?.toString() ?? '');

  // ── Research Interests (hierarchical) ─────────────────────────────────
  const initSubfields = parseJsonArray(profile.research_interests);
  const [selectedSubfields, setSelectedSubfields] = useState<string[]>(initSubfields);
  const initDomains = deriveDomains(initSubfields);
  const [selectedDomains, setSelectedDomains] = useState<string[]>(initDomains);
  const [expandedDomains, setExpandedDomains] = useState<string[]>(initDomains);

  // ── Education (structured) ─────────────────────────────────────────────
  const parseEducation = (raw: string | null) => {
    if (!raw?.trim()) return { institution: '', degree: '', graduationYear: '', grade: '' };
    try {
      const p = JSON.parse(raw);
      if (p && typeof p === 'object') return p;
    } catch { /* legacy */ }
    return { institution: raw, degree: '', graduationYear: '', grade: '' };
  };
  const initialEdu = parseEducation(profile.education);
  const [eduInstitution, setEduInstitution] = useState(initialEdu.institution ?? '');
  const [eduDegree, setEduDegree] = useState(initialEdu.degree ?? '');
  const [eduGradYear, setEduGradYear] = useState(initialEdu.graduationYear ?? '');
  const [eduGrade, setEduGrade] = useState(initialEdu.grade ?? '');

  // ── Experience (structured) ────────────────────────────────────────────
  const parseExperience = (raw: string | null) => {
    if (!raw?.trim()) return { jobTitle: '', organisation: '', duration: '', description: '' };
    try {
      const p = JSON.parse(raw);
      if (p && typeof p === 'object') return p;
    } catch { /* legacy */ }
    return { jobTitle: '', organisation: '', duration: '', description: raw };
  };
  const initialExp = parseExperience(profile.experience);
  const [expJobTitle, setExpJobTitle] = useState(initialExp.jobTitle ?? '');
  const [expOrganisation, setExpOrganisation] = useState(initialExp.organisation ?? '');
  const [expDuration, setExpDuration] = useState(initialExp.duration ?? '');
  const [expDescription, setExpDescription] = useState(initialExp.description ?? '');

  const [savingTab, setSavingTab] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');

  const profileCompletion = useMemo(() => getCompletionPercent(profile), [profile]);

  // Sync state when profile changes (e.g. after save)
  useEffect(() => {
    setFullName(profile.full_name ?? '');
    setNationality(profile.nationality ?? '');
    setCurrentInstitution(profile.current_institution ?? '');
    setIntendedDegree(profile.intended_degree ?? '');
    setFieldOfStudy(profile.field_of_study ?? '');
    setIntendedStartTerm(profile.intended_start_term ?? '');
    setGreVerbal(profile.gre_verbal?.toString() ?? '');
    setGreQuant(profile.gre_quant?.toString() ?? '');
    setGreAwa(profile.gre_awa?.toString() ?? '');
    setToeflScore(profile.toefl_score?.toString() ?? '');
    setIeltsScore(profile.ielts_score?.toString() ?? '');
    setGmatScore(profile.gmat_score?.toString() ?? '');

    const newSubfields = parseJsonArray(profile.research_interests);
    setSelectedSubfields(newSubfields);
    const newDomains = deriveDomains(newSubfields);
    setSelectedDomains(newDomains);
    setExpandedDomains(newDomains);

    const edu = parseEducation(profile.education);
    setEduInstitution(edu.institution ?? '');
    setEduDegree(edu.degree ?? '');
    setEduGradYear(edu.graduationYear ?? '');
    setEduGrade(edu.grade ?? '');

    const exp = parseExperience(profile.experience);
    setExpJobTitle(exp.jobTitle ?? '');
    setExpOrganisation(exp.organisation ?? '');
    setExpDuration(exp.duration ?? '');
    setExpDescription(exp.description ?? '');
  }, [profile]);

  const nationalityOptions = useMemo(() => {
    const q = nationality.trim();
    if (!q) return [];
    return COUNTRIES.filter(c => c.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 5)
      .map(c => ({ value: c, label: c }));
  }, [nationality]);

  // ── Save helper ────────────────────────────────────────────────────────
  const saveProfile = async (tab: string, updates: Record<string, unknown>): Promise<boolean> => {
    setSavingTab(tab);
    setSaveError('');
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)
      .select('*')
      .single();
    if (error) { setSaveError(error.message); setSavingTab(null); return false; }
    onProfileUpdated(data as ProfileRow);
    toast.success('Profile updated successfully');
    setSavingTab(null);
    return true;
  };

  // ── Save handlers ──────────────────────────────────────────────────────
  const handleSavePersonal = () => saveProfile('personal', {
    full_name: fullName.trim() || null,
    nationality: nationality.trim() || null,
    current_institution: currentInstitution.trim() || null,
    intended_degree: intendedDegree.trim() || null,
    field_of_study: fieldOfStudy.trim() || null,
    intended_start_term: intendedStartTerm.trim() || null,
  });

  const handleSaveTests = () => saveProfile('tests', {
    gre_verbal: parseGreScore(greVerbal),
    gre_quant: parseGreScore(greQuant),
    gre_awa: parseGreScore(greAwa),
    toefl_score: parseIntScore(toeflScore),
    ielts_score: parseDecimalScore(ieltsScore),
    gmat_score: parseIntScore(gmatScore),
  });

  const handleSaveResearch = () => saveProfile('research', {
    research_interests: JSON.stringify(selectedSubfields),
    research_domain: JSON.stringify(selectedDomains),
  });

  const handleSaveEducation = () => saveProfile('education', {
    education: JSON.stringify({
      institution: eduInstitution.trim(),
      degree: eduDegree.trim(),
      graduationYear: eduGradYear.trim(),
      grade: eduGrade.trim(),
    }),
  });

  const handleSaveExperience = () => saveProfile('experience', {
    experience: JSON.stringify({
      jobTitle: expJobTitle.trim(),
      organisation: expOrganisation.trim(),
      duration: expDuration.trim(),
      description: expDescription.trim(),
    }),
  });

  // ── Research interaction handlers ──────────────────────────────────────
  const toggleDomain = (domain: string) => {
    const isSelected = selectedDomains.includes(domain);
    if (isSelected) {
      setSelectedDomains(prev => prev.filter(d => d !== domain));
      setExpandedDomains(prev => prev.filter(d => d !== domain));
    } else {
      setSelectedDomains(prev => [...prev, domain]);
      setExpandedDomains(prev => prev.includes(domain) ? prev : [...prev, domain]);
    }
  };

  const toggleExpanded = (domain: string) => {
    setExpandedDomains(prev =>
      prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]
    );
  };

  const toggleSubfield = (subfield: string) => {
    setSelectedSubfields(prev =>
      prev.includes(subfield) ? prev.filter(s => s !== subfield) : [...prev, subfield]
    );
  };

  return (
    <>
      {saveError && (
        <p className="text-sm text-red-600" role="alert">{saveError}</p>
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
        <TabsList className="flex w-full justify-start overflow-x-auto pb-1 scrollbar-hide">
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

        {/* ── PERSONAL ── */}
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
                <select
                  id="intendedStartTerm"
                  value={intendedStartTerm}
                  onChange={e => setIntendedStartTerm(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select a term</option>
                  {TERM_OPTIONS.map(term => (
                    <option key={term} value={term}>{term}</option>
                  ))}
                </select>
              </div>
              <Button onClick={handleSavePersonal} disabled={savingTab === 'personal'} className="min-h-[44px]">
                {savingTab === 'personal' ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── EDUCATION ── */}
        <TabsContent value="education">
          <Card>
            <CardHeader>
              <CardTitle>Education</CardTitle>
              <CardDescription>Academic history for your applications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eduInstitution">Institution</Label>
                <Input
                  id="eduInstitution"
                  value={eduInstitution}
                  onChange={e => setEduInstitution(e.target.value)}
                  placeholder="e.g. University of Lagos"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eduDegree">Degree</Label>
                <Input
                  id="eduDegree"
                  value={eduDegree}
                  onChange={e => setEduDegree(e.target.value)}
                  placeholder="e.g. BSc Computer Science"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eduGradYear">Year of Graduation</Label>
                  <Input
                    id="eduGradYear"
                    value={eduGradYear}
                    onChange={e => setEduGradYear(e.target.value)}
                    placeholder="e.g. 2025"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eduGrade">Grade / GPA</Label>
                  <Input
                    id="eduGrade"
                    value={eduGrade}
                    onChange={e => setEduGrade(e.target.value)}
                    placeholder="e.g. 4.8/5.0 or First Class"
                  />
                </div>
              </div>
              <Button onClick={handleSaveEducation} disabled={savingTab === 'education'} className="min-h-[44px]">
                {savingTab === 'education' ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TESTS ── */}
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
                  <Input id="greVerbal" type="number" value={greVerbal} onChange={e => setGreVerbal(e.target.value)} placeholder="—" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="greQuant">GRE Quant</Label>
                  <Input id="greQuant" type="number" value={greQuant} onChange={e => setGreQuant(e.target.value)} placeholder="—" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="greAwa">GRE AWA</Label>
                  <Input id="greAwa" type="number" step="0.5" value={greAwa} onChange={e => setGreAwa(e.target.value)} placeholder="—" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="toeflScore">TOEFL</Label>
                  <Input id="toeflScore" type="number" value={toeflScore} onChange={e => setToeflScore(e.target.value)} placeholder="—" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ieltsScore">IELTS</Label>
                  <Input id="ieltsScore" type="number" step="0.5" value={ieltsScore} onChange={e => setIeltsScore(e.target.value)} placeholder="—" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gmatScore">GMAT</Label>
                  <Input id="gmatScore" type="number" value={gmatScore} onChange={e => setGmatScore(e.target.value)} placeholder="—" />
                </div>
              </div>
              <Button onClick={handleSaveTests} disabled={savingTab === 'tests'} className="min-h-[44px]">
                {savingTab === 'tests' ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── RESEARCH INTERESTS ── */}
        <TabsContent value="research">
          <Card>
            <CardHeader>
              <CardTitle>Research Interests</CardTitle>
              <CardDescription>
                Select your broad areas then specific subfields within each
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Domain chips */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Broad Areas
                </p>
                <div className="flex flex-wrap gap-2">
                  {RESEARCH_INTERESTS.map(({ domain }) => {
                    const isSelected = selectedDomains.includes(domain);
                    return (
                      <button
                        key={domain}
                        type="button"
                        onClick={() => toggleDomain(domain)}
                        className={cn(
                          'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                          isSelected
                            ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                            : 'bg-background text-muted-foreground border-border hover:border-[#4F46E5] hover:text-[#4F46E5]'
                        )}
                      >
                        {domain}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subfield sections — only when domains selected */}
              {selectedDomains.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Specific Subfields
                  </p>
                  {RESEARCH_INTERESTS
                    .filter(d => selectedDomains.includes(d.domain))
                    .map(({ domain, subfields }) => {
                      const isExpanded = expandedDomains.includes(domain);
                      return (
                        <div key={domain} className="rounded-lg border border-border overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleExpanded(domain)}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-accent/50 transition-colors"
                          >
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {domain}
                            </span>
                            {isExpanded
                              ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                              : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            }
                          </button>
                          {isExpanded && (
                            <div className="px-4 pb-3 pt-2 flex flex-wrap gap-2 border-t border-border bg-muted/20">
                              {subfields.map(subfield => {
                                const isChosen = selectedSubfields.includes(subfield);
                                return (
                                  <button
                                    key={subfield}
                                    type="button"
                                    onClick={() => toggleSubfield(subfield)}
                                    className={cn(
                                      'px-3 py-1 text-xs rounded-full border transition-colors',
                                      isChosen
                                        ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                                        : 'bg-background text-muted-foreground border-border hover:border-[#4F46E5] hover:text-[#4F46E5]'
                                    )}
                                  >
                                    {subfield}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Selected subfields summary */}
              {selectedSubfields.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Your selected interests ({selectedSubfields.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedSubfields.map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => toggleSubfield(tag)}
                          className="ml-1 hover:text-destructive"
                          aria-label={`Remove ${tag}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

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

        {/* ── EXPERIENCE ── */}
        <TabsContent value="experience">
          <Card>
            <CardHeader>
              <CardTitle>Experience</CardTitle>
              <CardDescription>Work and research experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="expJobTitle">Job Title</Label>
                <Input
                  id="expJobTitle"
                  value={expJobTitle}
                  onChange={e => setExpJobTitle(e.target.value)}
                  placeholder="e.g. Research Assistant"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expOrganisation">Organisation</Label>
                <Input
                  id="expOrganisation"
                  value={expOrganisation}
                  onChange={e => setExpOrganisation(e.target.value)}
                  placeholder="e.g. Google DeepMind"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expDuration">Duration</Label>
                <Input
                  id="expDuration"
                  value={expDuration}
                  onChange={e => setExpDuration(e.target.value)}
                  placeholder="e.g. June 2023 – August 2024"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expDescription">Description</Label>
                <Textarea
                  id="expDescription"
                  value={expDescription}
                  onChange={e => setExpDescription(e.target.value)}
                  placeholder="Brief description of your role and key achievements..."
                  rows={3}
                  className="resize-y"
                />
              </div>
              <Button onClick={handleSaveExperience} disabled={savingTab === 'experience'} className="min-h-[44px]">
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
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setFetchError('');

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setFetchError(userError?.message || 'Not signed in');
        setProfile(null);
        setLoading(false);
        return;
      }

      setEmail(user.email ?? '');

      let { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        setFetchError(profileError.message);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (!data) {
        const { error: upsertError } = await supabase.from('profiles').upsert({ id: user.id });
        if (upsertError) {
          setFetchError(upsertError.message);
          setProfile(null);
          setLoading(false);
          return;
        }
        const refetch = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        if (refetch.error) {
          setFetchError(refetch.error.message);
          setProfile(null);
          setLoading(false);
          return;
        }
        data = refetch.data;
      }

      setProfile(data as ProfileRow);
      setLoading(false);
    };

    fetchProfile();
  }, []);

  if (loading) return <PageSkeleton />;

  if (fetchError) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-sm text-red-600" role="alert">{fetchError}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-sm text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  const displayName = profile.full_name?.trim() || email || 'Your profile';
  const initials = getProfileInitials(profile.full_name, email);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader 
        title="Universal Profile"
        subtitle="Complete your profile once and reuse it"
        backTo="/dashboard"
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-semibold"
          style={{ backgroundColor: '#4F46E5' }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-base font-semibold truncate">{displayName}</p>
          {email && <p className="text-[13px] text-muted-foreground truncate">{email}</p>}
        </div>
      </div>

      <ProfilePageContent
        key={`${profile.id}-${profile.full_name ?? ''}`}
        profile={profile}
        email={email}
        onProfileUpdated={setProfile}
      />
      </div>
    </div>
  );
}
