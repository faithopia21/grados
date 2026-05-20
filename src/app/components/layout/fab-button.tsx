import { Plus } from 'lucide-react';

interface FABButtonProps {
  onClick: () => void;
}

export function FABButton({ onClick }: FABButtonProps) {
  return (
    <button
      onClick={onClick}
      className="md:hidden fixed bottom-[88px] right-4 w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-lg z-40 transition-transform active:scale-95"
      style={{ backgroundColor: '#4F46E5' }}
    >
      <Plus className="h-6 w-6 text-white" />
    </button>
  );
}
