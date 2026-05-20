import { useState, useEffect } from 'react';
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

    const programPayload = {
      school_name: formData.universityName.trim(),
      program_name: formData.programName.trim(),
      degree_type: formData.degree,
      country: formData.country.trim(),
      deadline: formData.applicationDeadline,
      funding_available: formData.fundingAvailable,
      portal_url: formData.portalUrl.trim() || null,
    };

    if (isEditing && editingProgramId) {
      const { error: updateError } = await supabase
        .from('programs')
        .update(programPayload)
        .eq('id', editingProgramId);

      setLoading(false);

      if (updateError) {
        setError(updateError.message);
        return;
      }

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

    const { error: insertError } = await supabase.from('programs').insert({
      ...programPayload,
      user_id: user.id,
      status: 'Not Started',
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    toast.success('School added successfully');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit School' : 'Add New School'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your application information'
              : 'Create a new application workspace to track your graduate program application'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="universityName">
              University Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="universityName"
              placeholder="e.g., Stanford University"
              value={formData.universityName}
              onChange={e => handleChange('universityName', e.target.value)}
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
              <Input
                id="programName"
                placeholder="e.g., Computer Science"
                value={formData.programName}
                onChange={e => handleChange('programName', e.target.value)}
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
              <Input
                id="country"
                placeholder="e.g., United States"
                value={formData.country}
                onChange={e => handleChange('country', e.target.value)}
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Save changes' : 'Create Application Workspace'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
