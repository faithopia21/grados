import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

const CHECKLIST_STATUSES = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'ready', label: 'Ready' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'done', label: 'Done' },
] as const;

interface ChecklistStatusSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function ChecklistStatusSelect({ value, onChange }: ChecklistStatusSelectProps) {
  const normalized = CHECKLIST_STATUSES.some(s => s.value === value)
    ? value
    : 'not_started';

  return (
    <Select value={normalized} onValueChange={onChange}>
      <SelectTrigger className="w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CHECKLIST_STATUSES.map(s => (
          <SelectItem key={s.value} value={s.value}>
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
