import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeGetTime(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'No date set';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Invalid date';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'No date set';
  }
}

export function getDaysUntil(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    const diff = d.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

export function getDeadlineStatus(daysUntil: number): 'urgent' | 'soon' | 'upcoming' | 'future' {
  if (daysUntil < 0) return 'urgent';
  if (daysUntil <= 7) return 'urgent';
  if (daysUntil <= 30) return 'soon';
  if (daysUntil <= 60) return 'upcoming';
  return 'future';
}
