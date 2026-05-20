import { DocumentStatus } from '../../types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Badge } from './ui/badge';

interface DocumentStatusSelectProps {
  value: DocumentStatus;
  onChange: (value: DocumentStatus) => void;
}

export function DocumentStatusSelect({ value, onChange }: DocumentStatusSelectProps) {
  const getStatusConfig = (status: DocumentStatus) => {
    const configs: Record<DocumentStatus, { label: string; variant: any }> = {
      not_started: { label: 'Not Started', variant: 'outline' },
      drafting: { label: 'Drafting', variant: 'warning' },
      ready: { label: 'Ready', variant: 'success' },
      submitted: { label: 'Submitted', variant: 'default' },
      not_required: { label: 'Not Required', variant: 'secondary' },
    };
    return configs[status];
  };

  const config = getStatusConfig(value);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[140px]">
        <SelectValue>
          <Badge variant={config.variant} className="text-xs">
            {config.label}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="not_started">Not Started</SelectItem>
        <SelectItem value="drafting">Drafting</SelectItem>
        <SelectItem value="ready">Ready</SelectItem>
        <SelectItem value="submitted">Submitted</SelectItem>
        <SelectItem value="not_required">Not Required</SelectItem>
      </SelectContent>
    </Select>
  );
}
