export interface DbDocument {
  id: string;
  user_id: string;
  name: string;
  doc_type: string;
  file_url: string;
  file_size: string;
  version: number;
  created_at: string;
  storage_path?: string | null;
}

export const DOC_TYPE_OPTIONS = [
  { value: 'sop', label: 'SOP' },
  { value: 'cv', label: 'CV' },
  { value: 'transcript', label: 'Transcript' },
  { value: 'recommendation', label: 'Recommendation Letter' },
  { value: 'writing_sample', label: 'Writing Sample' },
  { value: 'other', label: 'Other' },
] as const;

export type DocTypeValue = (typeof DOC_TYPE_OPTIONS)[number]['value'];

export const DOC_FILTER_TABS = [
  { id: 'all', label: 'All Documents' },
  { id: 'sop', label: 'SOP' },
  { id: 'cv', label: 'CV' },
  { id: 'transcript', label: 'Transcripts' },
  { id: 'recommendation', label: 'Recommendations' },
  { id: 'writing_sample', label: 'Writing Sample' },
  { id: 'other', label: 'Other' },
] as const;

const STORAGE_LIMIT_MB = 50;

export function getDocTypeLabel(docType: string): string {
  const found = DOC_TYPE_OPTIONS.find(o => o.value === docType);
  return found?.label ?? docType;
}

export function getDocTypeBadgeClass(docType: string): string {
  switch (docType) {
    case 'sop':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300';
    case 'cv':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
    case 'transcript':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
    case 'recommendation':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300';
    case 'writing_sample':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
}

export function formatDocumentDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function parseFileSizeKb(fileSize: string): number {
  const match = fileSize?.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

export function getTotalStorageMb(documents: DbDocument[]): {
  usedMb: number;
  limitMb: number;
  percent: number;
} {
  const totalKb = documents.reduce((sum, d) => sum + parseFileSizeKb(d.file_size), 0);
  const usedMb = totalKb / 1024;
  const percent = Math.min((usedMb / STORAGE_LIMIT_MB) * 100, 100);
  return { usedMb, limitMb: STORAGE_LIMIT_MB, percent };
}

export function getStoragePath(doc: DbDocument): string | null {
  if (doc.storage_path) return doc.storage_path;
  if (!doc.file_url) return null;
  const marker = '/documents/';
  const idx = doc.file_url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(doc.file_url.slice(idx + marker.length).split('?')[0]);
}

export function matchesDocFilter(docType: string, filter: string): boolean {
  if (filter === 'all') return true;
  if (filter === 'other') {
    return docType === 'other';
  }
  if (filter === 'writing_sample') {
    return docType === 'writing_sample';
  }
  return docType === filter;
}

export const ACCEPTED_FILE_TYPES = '.pdf,.docx,.txt';
