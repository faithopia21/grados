export function formatNoteTimestamp(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatNoteCardTimestamp(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export type ParsedNoteContent = {
  title: string;
  content: string;
};

export function parseNoteContent(raw: string | null | undefined): ParsedNoteContent {
  if (!raw?.trim()) {
    return { title: '', content: '' };
  }
  try {
    const parsed = JSON.parse(raw) as { title?: string; content?: string };
    if (parsed && typeof parsed === 'object') {
      return {
        title: typeof parsed.title === 'string' ? parsed.title : '',
        content: typeof parsed.content === 'string' ? parsed.content : raw,
      };
    }
  } catch {
    // Legacy plain-text notes
  }
  return { title: '', content: raw };
}

export function serializeNoteContent(title: string, content: string): string {
  return JSON.stringify({ title: title.trim(), content });
}
