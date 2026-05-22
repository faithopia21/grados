import { useNavigate } from 'react-router';
import { ChevronLeft } from 'lucide-react';

import { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  backTo?: string;  // optional explicit path
  showBack?: boolean;  // defaults to true
  children?: ReactNode;
}

export function PageHeader({ 
  title, subtitle, backTo, showBack = true, children
}: PageHeaderProps) {
  const navigate = useNavigate();
  
  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);  // browser back
    }
  };
  
  return (
    <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {showBack && (
            <button
              onClick={handleBack}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-accent transition-colors shrink-0"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground truncate">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {children && (
          <div className="flex items-center gap-2 shrink-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
