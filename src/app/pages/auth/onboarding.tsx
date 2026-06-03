import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { AutocompleteInput } from '../../components/autocomplete-input';
import { COUNTRIES } from '../../../data/countries';
import gradosLogo from '../../../assets/logo.svg';

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

function parseGreScore(value: string): number | null {
  if (!value.trim()) return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

export function Onboarding() {
  const navigate = useNavigate();
  const [degreeType, setDegreeType] = useState('');
  const [startTerm, setStartTerm] = useState('');
  const [currentInstitution, setCurrentInstitution] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [nationality, setNationality] = useState('');
  const [greTaken, setGreTaken] = useState('');
  const [greVerbal, setGreVerbal] = useState('');
  const [greQuant, setGreQuant] = useState('');
  const [greAwa, setGreAwa] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(2);

  useEffect(() => {
    const loadExistingProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profile) {
        if (profile.intended_degree) setDegreeType(profile.intended_degree);
        if (profile.intended_start_term) setStartTerm(profile.intended_start_term);
        if (profile.current_institution) setCurrentInstitution(profile.current_institution);
        if (profile.field_of_study) setFieldOfStudy(profile.field_of_study);
        if (profile.nationality) setNationality(profile.nationality);
        if (profile.gre_verbal || profile.gre_quant) {
          setGreTaken('Yes');
          if (profile.gre_verbal) setGreVerbal(profile.gre_verbal.toString());
          if (profile.gre_quant) setGreQuant(profile.gre_quant.toString());
          if (profile.gre_awa) setGreAwa(profile.gre_awa.toString());
        }
      }
    };
    loadExistingProfile();
  }, []);

  const nationalityOptions = useMemo(() => {
    const q = nationality.trim();
    if (!q) return [];
    return COUNTRIES.filter(c => c.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 5)
      .map(c => ({ value: c, label: c }));
  }, [nationality]);

  const handleSkip = () => {
    navigate('/dashboard');
  };

  const saveProfile = async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      const msg = userError?.message || 'You must be signed in to save your profile';
      setError(msg);
      return { error: msg };
    }

    const profileData: any = { id: user.id };

    if (degreeType) profileData.intended_degree = degreeType;
    if (startTerm) profileData.intended_start_term = startTerm;
    if (currentInstitution.trim()) profileData.current_institution = currentInstitution.trim();
    if (fieldOfStudy.trim()) profileData.field_of_study = fieldOfStudy.trim();
    if (nationality.trim()) profileData.nationality = nationality.trim();
    if (greTaken === 'Yes') {
      if (greVerbal) profileData.gre_verbal = parseGreScore(greVerbal);
      if (greQuant) profileData.gre_quant = parseGreScore(greQuant);
      if (greAwa) profileData.gre_awa = parseGreScore(greAwa);
    }

    profileData.onboarding_completed = true;

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert(profileData);

    if (upsertError) {
      setError(`Profile save failed: ${upsertError.message}`);
      return { error: upsertError.message };
    }

    return { error: undefined };
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: saveError } = await saveProfile();

    setLoading(false);

    if (saveError) {
      return;
    }

    // Show step 3 complete briefly
    setCurrentStep(3);

    await new Promise(resolve => setTimeout(resolve, 600));

    toast.success('Welcome to GradOS! Profile saved.');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F8F8] dark:bg-background p-4">
      <div className="w-full max-w-[560px] bg-card rounded-2xl p-10 border border-border">
        {/* Logo */}
        <div className="flex justify-center mb-0">
          <img 
            src={gradosLogo} 
            alt="GradOS"
            className="h-20 w-auto mx-auto mb-3"
          />
        </div>

        {/* Progress Stepper */}
        <div className="flex items-center justify-center gap-0 mb-8">
          <div className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-green-500">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <span className="hidden sm:block text-xs">Account</span>
            </div>
            <div className="w-8 sm:w-12 h-px bg-border mx-1 mb-3 sm:mb-4" />
          </div>

          <div className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm ${currentStep >= 3 ? 'bg-green-500' : ''}`}
                style={currentStep < 3 ? { backgroundColor: '#4F46E5' } : {}}
              >
                {currentStep >= 3 ? <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" /> : '2'}
              </div>
              <span className="hidden sm:block text-xs">Your profile</span>
            </div>
            <div className="w-8 sm:w-12 h-px bg-border mx-1 mb-3 sm:mb-4" />
          </div>

          <div className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm ${currentStep >= 3 ? 'bg-[#4F46E5] text-white' : 'bg-muted text-muted-foreground'}`}>
                3
              </div>
              <span className={`hidden sm:block text-xs ${currentStep >= 3 ? 'text-foreground' : 'text-muted-foreground'}`}>Done</span>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl mb-2">Tell us about yourself</h1>
          <p className="text-sm text-muted-foreground">
            This information helps personalise your experience. You can update it anytime.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 mb-4" role="alert">
            {error}
          </p>
        )}

        {/* Form */}
        <form onSubmit={handleContinue} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="degreeType">Intended degree type</Label>
              <Select value={degreeType} onValueChange={setDegreeType}>
                <SelectTrigger id="degreeType" className="border border-border rounded-lg bg-background px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500">
                  <SelectValue placeholder="Select degree" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MSc">MSc</SelectItem>
                  <SelectItem value="PhD">PhD</SelectItem>
                  <SelectItem value="MBA">MBA</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startTerm">Intended start term</Label>
              <Select value={startTerm} onValueChange={setStartTerm}>
                <SelectTrigger id="startTerm" className="border border-border rounded-lg bg-background px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {TERM_OPTIONS.map(term => (
                    <SelectItem key={term} value={term}>{term}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentInstitution">Current institution</Label>
              <Input
                id="currentInstitution"
                type="text"
                placeholder="University of Lagos"
                value={currentInstitution}
                onChange={(e) => setCurrentInstitution(e.target.value)}
                className="border border-border rounded-lg bg-background px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fieldOfStudy">Field of study</Label>
              <Input
                id="fieldOfStudy"
                type="text"
                placeholder="Computer Science"
                value={fieldOfStudy}
                onChange={(e) => setFieldOfStudy(e.target.value)}
                className="border border-border rounded-lg bg-background px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality</Label>
              <AutocompleteInput
                id="nationality"
                placeholder="Your nationality"
                value={nationality}
                onChange={setNationality}
                options={nationalityOptions}
                inputClassName="border border-border rounded-lg bg-background px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="greTaken">GRE taken?</Label>
              <Select value={greTaken} onValueChange={setGreTaken}>
                <SelectTrigger id="greTaken" className="border border-border rounded-lg bg-background px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Not required">Not required for my programs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {greTaken === 'Yes' && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="greVerbal">GRE Verbal</Label>
                <Input
                  id="greVerbal"
                  type="number"
                  placeholder="170"
                  value={greVerbal}
                  onChange={(e) => setGreVerbal(e.target.value)}
                  className="border border-border rounded-lg bg-background px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="greQuant">GRE Quant</Label>
                <Input
                  id="greQuant"
                  type="number"
                  placeholder="170"
                  value={greQuant}
                  onChange={(e) => setGreQuant(e.target.value)}
                  className="border border-border rounded-lg bg-background px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="greAwa">GRE AWA</Label>
                <Input
                  id="greAwa"
                  type="number"
                  step="0.5"
                  placeholder="6.0"
                  value={greAwa}
                  onChange={(e) => setGreAwa(e.target.value)}
                  className="border border-border rounded-lg bg-background px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleSkip} disabled={loading}>
              Skip for now
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save and continue →'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
