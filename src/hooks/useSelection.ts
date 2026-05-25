import { useState, useCallback } from 'react';

export function useSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((id: string, force?: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (force !== undefined) {
        if (force) next.add(id);
        else next.delete(id);
      } else {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    if (selectedIds.size === ids.length && ids.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ids));
    }
  }, [selectedIds.size]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  return {
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    isSelectionMode: selectedIds.size > 0,
  };
}
