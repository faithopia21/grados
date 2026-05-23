/** Checklist item status ↔ is_done sync helpers */

export function normalizeChecklistStatus(status: string | null | undefined): string {
  if (!status) return 'Not Started';
  const n = status.toLowerCase().replace(/\s+/g, '_');
  if (n === 'drafting') return 'In Progress';
  return n;
}

export function statusImpliesDone(status: string | null | undefined): boolean {
  const n = normalizeChecklistStatus(status);
  return n === 'submitted' || n === 'ready' || n === 'done';
}

export function checkboxToStatus(isDone: boolean): string {
  return isDone ? 'done' : 'Not Started';
}

export function resolveChecklistUpdate(
  current: { is_done: boolean; status: string | null },
  change: { is_done?: boolean; status?: string }
): { is_done: boolean; status: string } {
  if (change.status !== undefined) {
    const status = change.status;
    return { status, is_done: statusImpliesDone(status) };
  }
  if (change.is_done !== undefined) {
    const status = checkboxToStatus(change.is_done);
    return { is_done: change.is_done, status };
  }
  return {
    is_done: current.is_done,
    status: current.status ?? 'Not Started',
  };
}
