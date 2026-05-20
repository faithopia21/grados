import { ApplicationStatus } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface StatusUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: ApplicationStatus;
  onStatusChange: (status: ApplicationStatus) => void;
}

export function StatusUpdateDialog({
  open,
  onOpenChange,
  currentStatus,
  onStatusChange,
}: StatusUpdateDialogProps) {
  const statuses: { value: ApplicationStatus; label: string; variant: any }[] = [
    { value: 'not_started', label: 'Not Started', variant: 'outline' },
    { value: 'in_progress', label: 'In Progress', variant: 'warning' },
    { value: 'ready_to_submit', label: 'Ready to Submit', variant: 'default' },
    { value: 'submitted', label: 'Submitted', variant: 'success' },
    { value: 'interview', label: 'Interview', variant: 'default' },
    { value: 'accepted', label: 'Accepted', variant: 'success' },
    { value: 'rejected', label: 'Rejected', variant: 'destructive' },
    { value: 'waitlisted', label: 'Waitlisted', variant: 'warning' },
  ];

  const handleStatusSelect = (status: ApplicationStatus) => {
    onStatusChange(status);
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
          {statuses.map(status => (
            <Button
              key={status.value}
              variant={currentStatus === status.value ? 'default' : 'outline'}
              onClick={() => handleStatusSelect(status.value)}
              className="justify-start h-auto py-3"
            >
              <Badge variant={status.variant} className="mr-2">
                {currentStatus === status.value && '✓'}
              </Badge>
              {status.label}
            </Button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
