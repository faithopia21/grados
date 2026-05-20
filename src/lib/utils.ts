import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getDaysUntil(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  const diff = d.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getDeadlineStatus(daysUntil: number): 'urgent' | 'soon' | 'upcoming' | 'future' {
  if (daysUntil < 0) return 'urgent';
  if (daysUntil <= 7) return 'urgent';
  if (daysUntil <= 30) return 'soon';
  if (daysUntil <= 60) return 'upcoming';
  return 'future';
}
