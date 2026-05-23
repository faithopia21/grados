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
import { cn } from '../../lib/utils';

export const PROGRAM_STATUS_OPTIONS = [
  'Not Started',
  'In Progress',
  'Ready to Submit',
  'Submitted',
  'Interview',
  'Accepted',
  'Rejected',
  'Waitlisted',
] as const;

export type ProgramStatusLabel = (typeof PROGRAM_STATUS_OPTIONS)[number];

interface StatusUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: string;
  onConfirm: (status: string) => void | Promise<void>;
  confirming?: boolean;
}

function normalizeStatus(status: string): string {
  return status?.toLowerCase().replace(/\s+/g, '_') ?? '';
}

function statusesMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const map: Record<string, string> = {
    'Not Started': 'not started',
    'In Progress': 'in progress',
    'Ready to Submit': 'ready to submit',
    submitted: 'submitted',
    interview: 'interview',
    accepted: 'accepted',
    rejected: 'rejected',
    waitlisted: 'waitlisted',
  };
  return normalizeStatus(a) === normalizeStatus(b) || map[normalizeStatus(a)] === normalizeStatus(b);
}

export function StatusUpdateDialog({
  open,
  onOpenChange,
  currentStatus,
  onConfirm,
  confirming = false,
}: StatusUpdateDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);

  useEffect(() => {
    if (open) {
      setSelectedStatus(currentStatus);
    }
  }, [open, currentStatus]);

  const handleConfirm = async () => {
    await onConfirm(selectedStatus);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Application Status</DialogTitle>
          <DialogDescription>
            Select the current status of this application
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-4">
          {PROGRAM_STATUS_OPTIONS.map(status => {
            const isSelected = statusesMatch(selectedStatus, status);
            return (
              <button
                key={status}
                type="button"
                onClick={() => setSelectedStatus(status)}
                className={cn(
                  'justify-start h-auto py-3 px-4 rounded-md border text-sm font-medium transition-colors text-left',
                  isSelected
                    ? 'border-[#4F46E5] bg-[#4F46E5] text-white'
                    : 'border-border bg-background hover:bg-accent'
                )}
              >
                {status}
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirming}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={confirming}
            style={{ backgroundColor: '#4F46E5' }}
            className="text-white hover:opacity-90"
          >
            {confirming ? 'Saving...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
