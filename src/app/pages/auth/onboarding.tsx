import { useState, useMemo } from 'react';
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
      return { error: userError?.message || 'You must be signed in to save your profile' };
    }

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        intended_degree: degreeType || null,
        field_of_study: fieldOfStudy.trim() || null,
        current_institution: currentInstitution.trim() || null,
        nationality: nationality.trim() || null,
        intended_start_term: startTerm || null,
        gre_verbal: greTaken === 'Yes' ? parseGreScore(greVerbal) : null,
        gre_quant: greTaken === 'Yes' ? parseGreScore(greQuant) : null,
        gre_awa: greTaken === 'Yes' ? parseGreScore(greAwa) : null,
        onboarding_completed: true,
      });

    return { error: upsertError?.message };
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: saveError } = await saveProfile();

    setLoading(false);

    if (saveError) {
      setError(saveError);
      return;
    }

    toast.success('Welcome to GradOS! Your profile has been saved.');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F8F8] dark:bg-background p-4">
      <div className="w-full max-w-[560px] bg-card rounded-2xl p-10 border border-border">
        {/* Progress Stepper */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <span className="ml-2 text-sm">Account</span>
            </div>

            <div className="w-16 h-0.5 bg-border mx-2" />

            <div className="flex items-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                style={{ backgroundColor: '#4F46E5' }}
              >
                2
              </div>
              <span className="ml-2 text-sm">Your profile</span>
            </div>

            <div className="w-16 h-0.5 bg-border mx-2" />

            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted text-muted-foreground text-sm">
                3
              </div>
              <span className="ml-2 text-sm text-muted-foreground">Done</span>
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
                <SelectTrigger id="degreeType">
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
                <SelectTrigger id="startTerm">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fall 2025">Fall 2025</SelectItem>
                  <SelectItem value="Spring 2026">Spring 2026</SelectItem>
                  <SelectItem value="Fall 2026">Fall 2026</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="greTaken">GRE taken?</Label>
              <Select value={greTaken} onValueChange={setGreTaken}>
                <SelectTrigger id="greTaken">
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
