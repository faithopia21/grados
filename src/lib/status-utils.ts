import { ApplicationStatus, DocumentStatus } from '../types';

export function formatApplicationStatus(status: ApplicationStatus): string {
  const labels: Record<ApplicationStatus, string> = {
    'Not Started': 'Not Started',
    'In Progress': 'In Progress',
    'Ready to Submit': 'Ready to Submit',
    submitted: 'Submitted',
    interview: 'Interview',
    accepted: 'Accepted',
    rejected: 'Rejected',
    waitlisted: 'Waitlisted',
  };
  return labels[status] || status;
}

export function formatDocumentStatus(status: DocumentStatus): string {
  const labels: Record<DocumentStatus, string> = {
    'Not Started': 'Not Started',
    drafting: 'Drafting',
    ready: 'Ready',
    submitted: 'Submitted',
    not_required: 'Not Required',
  };
  return labels[status] || status;
}
