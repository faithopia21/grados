export function normalizeProgramStatus(status: string): string {
  return status?.toLowerCase().replace(/\s+/g, '_') ?? 'Not Started';
}

export function getStatusBadgeVariant(status: string): 'outline' | 'default' | 'secondary' | 'destructive' {
  const key = normalizeProgramStatus(status);
  if (key === 'submitted' || key === 'accepted') return 'default';
  if (key === 'rejected') return 'destructive';
  if (key === 'In Progress' || key === 'waitlisted' || key === 'interview') return 'secondary';
  return 'outline';
}

export function getStatusBadgeClassName(status: string): string {
  const key = normalizeProgramStatus(status);
  if (key === 'submitted' || key === 'accepted') {
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0';
  }
  if (key === 'In Progress' || key === 'interview') {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-0';
  }
  if (key === 'Ready to Submit') {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-0';
  }
  if (key === 'rejected') {
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-0';
  }
  if (key === 'waitlisted') {
    return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-0';
  }
  return '';
}

export function displayProgramStatus(status: string): string {
  if (!status) return 'Not Started';
  const known = [
    'Not Started',
    'In Progress',
    'Ready to Submit',
    'Submitted',
    'Interview',
    'Accepted',
    'Rejected',
    'Waitlisted',
  ];
  const match = known.find(
    k => normalizeProgramStatus(k) === normalizeProgramStatus(status)
  );
  return match ?? status;
}
