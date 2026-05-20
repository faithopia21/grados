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

interface AddSchoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SchoolFormData) => void;
  initialData?: SchoolFormData;
  isEditing?: boolean;
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

export function AddSchoolDialog({ open, onOpenChange, onSubmit, initialData, isEditing = false }: AddSchoolDialogProps) {
  const [formData, setFormData] = useState<SchoolFormData>(initialData || {
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
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
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
    });
    onOpenChange(false);
  };

  const handleChange = (field: keyof SchoolFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit School' : 'Add New School'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your application information'
              : 'Create a new application workspace to track your graduate program application'
            }
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
              required
            />
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
                required
              />
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
              <Label htmlFor="department">
                Department <span className="text-destructive">*</span>
              </Label>
              <Input
                id="department"
                placeholder="e.g., School of Engineering"
                value={formData.department}
                onChange={e => handleChange('department', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">
                Country <span className="text-destructive">*</span>
              </Label>
              <Input
                id="country"
                placeholder="e.g., United States"
                value={formData.country}
                onChange={e => handleChange('country', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="portalUrl">
              Application Portal URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="portalUrl"
              type="url"
              placeholder="https://apply.university.edu"
              value={formData.portalUrl}
              onChange={e => handleChange('portalUrl', e.target.value)}
              required
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
                required
              />
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
                onChange={e => handleChange('fundingAvailable', e.target.checked ? 'true' : 'false')}
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Application Workspace</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
