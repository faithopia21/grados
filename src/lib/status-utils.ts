import { ApplicationStatus, DocumentStatus } from '../types';

export function formatApplicationStatus(status: ApplicationStatus): string {
  const labels: Record<ApplicationStatus, string> = {
    not_started: 'Not Started',
    in_progress: 'In Progress',
    ready_to_submit: 'Ready to Submit',
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
    not_started: 'Not Started',
    drafting: 'Drafting',
    ready: 'Ready',
    submitted: 'Submitted',
    not_required: 'Not Required',
  };
  return labels[status] || status;
}
