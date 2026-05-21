import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Input } from './ui/input';
import { cn } from '../../lib/utils';

export type AutocompleteOption = {
  value: string;
  label: string;
  secondary?: string;
  isCustom?: boolean;
};

interface AutocompleteInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (option: AutocompleteOption) => void;
  options: AutocompleteOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxResults?: number;
}

export function AutocompleteInput({
  id,
  value,
  onChange,
  onSelect,
  options,
  placeholder,
  disabled,
  className,
  maxResults = 5,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const visibleOptions = useMemo(
    () => options.slice(0, maxResults),
    [options, maxResults]
  );

  const updatePlacement = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    const rect = input.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = Math.min(visibleOptions.length, maxResults) * 44 + 8;
    setPlacement(spaceBelow < dropdownHeight && spaceAbove > spaceBelow ? 'top' : 'bottom');
  }, [visibleOptions.length, maxResults]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setHighlightIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) {
      updatePlacement();
      window.addEventListener('resize', updatePlacement);
      window.addEventListener('scroll', updatePlacement, true);
      return () => {
        window.removeEventListener('resize', updatePlacement);
        window.removeEventListener('scroll', updatePlacement, true);
      };
    }
  }, [open, updatePlacement, visibleOptions.length]);

  const selectOption = (option: AutocompleteOption) => {
    onChange(option.value);
    onSelect?.(option);
    setOpen(false);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      if (visibleOptions.length > 0) {
        setOpen(true);
        setHighlightIndex(0);
      }
      return;
    }

    if (e.key === 'Escape') {
      setOpen(false);
      setHighlightIndex(-1);
      return;
    }

    if (!open || visibleOptions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev =>
        prev < visibleOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev =>
        prev > 0 ? prev - 1 : visibleOptions.length - 1
      );
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      selectOption(visibleOptions[highlightIndex]);
    }
  };

  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  const showDropdown = open && visibleOptions.length > 0;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Input
        ref={inputRef}
        id={id}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        onChange={e => {
          onChange(e.target.value);
          setOpen(true);
          setHighlightIndex(-1);
        }}
        onFocus={() => {
          if (visibleOptions.length > 0) {
            setOpen(true);
            updatePlacement();
          }
        }}
        onKeyDown={handleKeyDown}
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        role="combobox"
      />

      {showDropdown && (
        <ul
          ref={listRef}
          role="listbox"
          className={cn(
            'absolute z-50 w-full rounded-md border border-border bg-card shadow-md overflow-hidden',
            placement === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1'
          )}
        >
          {visibleOptions.map((option, index) => (
            <li
              key={`${option.value}-${index}`}
              role="option"
              aria-selected={highlightIndex === index}
              className={cn(
                'flex items-center justify-between gap-2 px-3 py-2.5 text-sm cursor-pointer min-h-[44px]',
                highlightIndex === index
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50',
                option.isCustom && 'italic'
              )}
              onMouseEnter={() => setHighlightIndex(index)}
              onMouseDown={e => {
                e.preventDefault();
                selectOption(option);
              }}
            >
              <span className="truncate">{option.label}</span>
              {option.secondary && (
                <span className="text-muted-foreground text-xs shrink-0 ml-2">
                  {option.secondary}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
