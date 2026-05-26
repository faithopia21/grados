import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { AutocompleteInput } from './autocomplete-input';
import { searchUniversities, LOCAL_UNIVERSITIES } from '../../data/universities';
import { COUNTRIES } from '../../data/countries';

interface AddSchoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: SchoolFormData) => void;
  onSuccess?: () => void;
  initialData?: SchoolFormData;
  isEditing?: boolean;
  editingProgramId?: string | null;
}

export interface SchoolFormData {
  universityName: string;
  programName: string;
  degree: 'MSc' | 'PhD' | 'MA' | 'MBA';
  country: string;
  department: string;
  portalUrl: string;
  applicationDeadline: string;
  fundingDeadline?: string;
  fundingAvailable: boolean;
  notes?: string;
  tuition?: string;
  ranking?: string;
  round?: string;
}

const emptyForm: SchoolFormData = {
  universityName: '',
  programName: '',
  degree: 'MSc',
  country: '',
  department: '',
  portalUrl: '',
  applicationDeadline: '',
  fundingDeadline: '',
  fundingAvailable: false,
  notes: '',
  tuition: '',
  ranking: '',
  round: 'Regular Decision',
};

export function AddSchoolDialog({
  open,
  onOpenChange,
  onSubmit,
  onSuccess,
  initialData,
  isEditing = false,
  editingProgramId = null,
}: AddSchoolDialogProps) {
  const [formData, setFormData] = useState<SchoolFormData>(initialData || emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    universityName?: string;
    programName?: string;
    applicationDeadline?: string;
  }>({});
  const [universitySearchLoading, setUniversitySearchLoading] = useState(false);
  const [universitySearchFailed, setUniversitySearchFailed] = useState(false);
  const [universityApiResults, setUniversityApiResults] = useState<
    Awaited<ReturnType<typeof searchUniversities>>
  >([]);
  const [profileInterests, setProfileInterests] = useState<string[]>([]);

  const resetForm = () => {
    setFormData(emptyForm);
    setError('');
    setFieldErrors({});
  };

  const validate = () => {
    const errors: typeof fieldErrors = {};
    if (!formData.universityName.trim()) {
      errors.universityName = 'University name is required';
    }
    if (!formData.programName.trim()) {
      errors.programName = 'Program name is required';
    }
    if (!formData.applicationDeadline) {
      errors.applicationDeadline = 'Deadline is required';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    if (isEditing && onSubmit && !editingProgramId) {
      onSubmit(formData);
      resetForm();
      onOpenChange(false);
      return;
    }

    setLoading(true);

    const basePayload: Record<string, any> = {
      school_name: formData.universityName.trim(),
      program_name: formData.programName.trim(),
      degree_type: formData.degree,
      country: formData.country.trim(),
      deadline: formData.applicationDeadline || null,
      funding_available: formData.fundingAvailable,
    };

    if (isEditing && editingProgramId) {
      const updatePayload: Record<string, any> = { ...basePayload };

      if (formData.portalUrl?.trim()) updatePayload.portal_url = formData.portalUrl.trim();
      if (formData.department?.trim()) updatePayload.department = formData.department.trim();
      if (formData.round?.trim()) updatePayload.application_round = formData.round.trim();
      if (formData.tuition?.trim()) updatePayload.tuition = formData.tuition.trim();
      if (formData.ranking?.trim()) updatePayload.ranking = formData.ranking.trim();
      if (formData.fundingDeadline?.trim()) updatePayload.funding_deadline = formData.fundingDeadline.trim();
      if (formData.notes?.trim()) updatePayload.notes = formData.notes.trim();

      const { error: updateError } = await supabase
        .from('programs')
        .update(updatePayload)
        .eq('id', editingProgramId);

      if (updateError) {
        setLoading(false);
        setError(updateError.message);
        return;
      }

      if (formData.notes?.trim()) {
        const noteHtml = `<p>${formData.notes.trim()}</p>`;
        const { data: existingNote } = await supabase
          .from('program_notes')
          .select('id')
          .eq('program_id', editingProgramId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingNote) {
          await supabase.from('program_notes').update({ content: noteHtml, updated_at: new Date().toISOString() }).eq('id', existingNote.id);
        } else {
          await supabase.from('program_notes').insert({ program_id: editingProgramId, content: noteHtml, updated_at: new Date().toISOString() });
        }
      }

      setLoading(false);
      toast.success('Application updated successfully');
      resetForm();
      onOpenChange(false);
      onSuccess?.();
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setError(userError?.message || 'You must be signed in to add a school');
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: user.id });

    if (profileError) {
      setLoading(false);
      setError(profileError.message);
      return;
    }

    const insertPayload: Record<string, any> = {
      ...basePayload,
      user_id: user.id,
      status: 'Not Started',
      portal_url: formData.portalUrl?.trim() || null,
      department: formData.department?.trim() || null,
      application_round: formData.round?.trim() || null,
      tuition: formData.tuition?.trim() || null,
      ranking: formData.ranking?.trim() || null,
      funding_deadline: formData.fundingDeadline?.trim() || null,
      notes: formData.notes?.trim() || null,
    };

    const { data: newProgram, error: insertError } = await supabase
      .from('programs')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertError) {
      setLoading(false);
      setError(insertError.message);
      return;
    }

    if (formData.notes?.trim()) {
      const noteHtml = `<p>${formData.notes.trim()}</p>`;
      await supabase.from('program_notes').insert({ program_id: newProgram.id, content: noteHtml, updated_at: new Date().toISOString() });
    }

    setLoading(false);
    toast.success('Application updated successfully');
    resetForm();
    onOpenChange(false);
    onSuccess?.();
  };

  const handleChange = (field: keyof SchoolFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'universityName' && fieldErrors.universityName) {
      setFieldErrors(prev => ({ ...prev, universityName: undefined }));
    }
    if (field === 'programName' && fieldErrors.programName) {
      setFieldErrors(prev => ({ ...prev, programName: undefined }));
    }
    if (field === 'applicationDeadline' && fieldErrors.applicationDeadline) {
      setFieldErrors(prev => ({ ...prev, applicationDeadline: undefined }));
    }
  };

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else if (open && !isEditing) {
      setFormData(emptyForm);
      setError('');
      setFieldErrors({});
    }
  }, [initialData, open, isEditing]);

  // Load user's research interests when dialog opens
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('research_interests, field_of_study')
        .eq('id', user.id)
        .maybeSingle();
      const interests: string[] = [];
      if (profile?.research_interests) {
        try {
          const parsed = JSON.parse(profile.research_interests);
          if (Array.isArray(parsed)) interests.push(...parsed.filter((t): t is string => typeof t === 'string'));
        } catch { /* ignore */ }
      }
      const fieldOfStudy = profile?.field_of_study as string | undefined;
      const allSuggestions = fieldOfStudy
        ? [fieldOfStudy, ...interests.filter(i => i !== fieldOfStudy)]
        : interests;
      setProfileInterests(allSuggestions.slice(0, 8));
    })();
  }, [open]);

  useEffect(() => {
    const q = formData.universityName.trim();

    if (q.length < 2) {
      setUniversityApiResults([]);
      setUniversitySearchLoading(false);
      setUniversitySearchFailed(false);
      return;
    }

    setUniversitySearchLoading(true);
    setUniversitySearchFailed(false);

    const timer = setTimeout(async () => {
      try {
        const results = await searchUniversities(q);
        setUniversityApiResults(results);
        setUniversitySearchFailed(false);
      } catch {
        setUniversityApiResults([]);
        setUniversitySearchFailed(true);
      } finally {
        setUniversitySearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [formData.universityName]);

  const universityOptions = useMemo(() => {
    const q = formData.universityName.trim();

    if (universitySearchFailed) {
      return [
        {
          value: '',
          label: 'Search unavailable — type manually',
          disabled: true,
        },
      ];
    }

    const opts = universityApiResults.map(u => ({
      value: u.name,
      label: u.name,
      secondary: u.country,
    }));

    if (!universitySearchLoading && q.length >= 3 && opts.length === 0) {
      opts.push({
        value: q,
        label: `Add '${q}' manually`,
        isCustom: true,
      });
    }

    return opts;
  }, [
    formData.universityName,
    universityApiResults,
    universitySearchLoading,
    universitySearchFailed,
  ]);

  const countryOptions = useMemo(() => {
    const q = formData.country.trim();
    if (!q) return [];
    return COUNTRIES.filter(c => c.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 5)
      .map(c => ({ value: c, label: c }));
  }, [formData.country]);

  const programNameOptions = useMemo(() => {
    if (profileInterests.length === 0) return [];
    const q = formData.programName.trim().toLowerCase();
    const filtered = q
      ? profileInterests.filter(i => i.toLowerCase().includes(q))
      : profileInterests;
    if (filtered.length === 0) return [];
    return [
      { value: '', label: 'FROM YOUR PROFILE', disabled: true, isCustom: false },
      ...filtered.slice(0, 5).map(i => ({ value: i, label: i })),
    ];
  }, [profileInterests, formData.programName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] md:max-h-none overflow-y-auto w-full md:w-auto p-4 md:p-6 mb-0 mt-auto md:mb-auto rounded-b-none md:rounded-b-lg border-b-0 md:border-b transition-transform duration-300">
        <div className="md:hidden w-10 h-1 rounded-full bg-muted mx-auto mt-3 shrink-0" aria-hidden />
        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-4">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit School' : 'Add New School'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your application information'
              : 'Create a new application workspace to track your graduate program application'}
          </DialogDescription>
        </DialogHeader>

        <form id="add-school-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="universityName">
              University Name <span className="text-destructive">*</span>
            </Label>
            <AutocompleteInput
              id="universityName"
              placeholder="e.g., Stanford University"
              value={formData.universityName}
              onChange={value => handleChange('universityName', value)}
              options={universityOptions}
              loading={universitySearchLoading}
              maxResults={8}
              onSelect={option => {
                if (option.disabled) return;
                if (option.isCustom) {
                  handleChange('universityName', option.value);
                  return;
                }

                const localMatch = LOCAL_UNIVERSITIES.find(
                  u => u.name.toLowerCase() === option.value.toLowerCase()
                );

                setFormData(prev => ({
                  ...prev,
                  universityName: option.value,
                  country: option.secondary || localMatch?.country || prev.country,
                  portalUrl: prev.portalUrl || (option as any).web_pages?.[0] || localMatch?.web_pages?.[0] || '',
                  tuition: localMatch?.tuition || '',
                  ranking: localMatch?.ranking || '',
                }));
                if (fieldErrors.universityName) {
                  setFieldErrors(prev => ({ ...prev, universityName: undefined }));
                }
              }}
            />
            {fieldErrors.universityName && (
              <p className="text-sm text-red-600">{fieldErrors.universityName}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="programName">
                Program Name <span className="text-destructive">*</span>
              </Label>
              <AutocompleteInput
                id="programName"
                placeholder="e.g., Computer Science"
                value={formData.programName}
                onChange={value => handleChange('programName', value)}
                options={programNameOptions}
                maxResults={6}
                onSelect={option => {
                  handleChange('programName', option.value);
                  if (fieldErrors.programName) {
                    setFieldErrors(prev => ({ ...prev, programName: undefined }));
                  }
                }}
              />
              {fieldErrors.programName && (
                <p className="text-sm text-red-600">{fieldErrors.programName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="degree">
                Degree Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.degree}
                onValueChange={value => handleChange('degree', value)}
              >
                <SelectTrigger id="degree">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MSc">MSc</SelectItem>
                  <SelectItem value="PhD">PhD</SelectItem>
                  <SelectItem value="MA">MA</SelectItem>
                  <SelectItem value="MBA">MBA</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                placeholder="e.g., School of Engineering"
                value={formData.department}
                onChange={e => handleChange('department', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <AutocompleteInput
                id="country"
                placeholder="e.g., United States"
                value={formData.country}
                onChange={value => handleChange('country', value)}
                options={countryOptions}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tuition">Tuition (Annual)</Label>
              <Input
                id="tuition"
                placeholder="e.g. $58,000 or £12,000"
                value={formData.tuition || ''}
                onChange={e => handleChange('tuition', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ranking">University Ranking</Label>
              <Input
                id="ranking"
                placeholder="e.g. #1 QS World or #3 THE"
                value={formData.ranking || ''}
                onChange={e => handleChange('ranking', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="portalUrl">Application Portal URL</Label>
            <Input
              id="portalUrl"
              type="url"
              placeholder="https://apply.university.edu"
              value={formData.portalUrl}
              onChange={e => handleChange('portalUrl', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Direct link to the application portal - this is your bookmark replacement
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="applicationDeadline">
                Application Deadline <span className="text-destructive">*</span>
              </Label>
              <Input
                id="applicationDeadline"
                type="date"
                value={formData.applicationDeadline}
                onChange={e => handleChange('applicationDeadline', e.target.value)}
                className="[color-scheme:light] dark:[color-scheme:dark]"
              />
              {fieldErrors.applicationDeadline && (
                <p className="text-sm text-red-600">{fieldErrors.applicationDeadline}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fundingDeadline">Funding Deadline</Label>
              <Input
                id="fundingDeadline"
                type="date"
                value={formData.fundingDeadline}
                onChange={e => handleChange('fundingDeadline', e.target.value)}
                className="[color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.fundingAvailable}
                onChange={e => handleChange('fundingAvailable', e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Funding Available
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="round">Application Round</Label>
            <Select
              value={formData.round}
              onValueChange={value => handleChange('round', value)}
            >
              <SelectTrigger id="round">
                <SelectValue placeholder="Select round" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Early Decision">Early Decision</SelectItem>
                <SelectItem value="Early Action">Early Action</SelectItem>
                <SelectItem value="Regular Decision">Regular Decision</SelectItem>
                <SelectItem value="Rolling Admission">Rolling Admission</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information about this program..."
              value={formData.notes}
              onChange={e => handleChange('notes', e.target.value)}
              rows={4}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </form>
        </div>

        <DialogFooter className="sticky bottom-0 border-t border-border bg-card px-6 py-4 shrink-0 flex-col-reverse sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="min-h-[44px] w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" form="add-school-form" disabled={loading} className="min-h-[44px] w-full sm:w-auto bg-[#4F46E5] hover:bg-[#4338CA] text-white">
              {loading ? 'Saving...' : isEditing ? 'Save changes' : 'Create Application Workspace'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
