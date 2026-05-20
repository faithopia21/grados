import { useLocation, useNavigate } from 'react-router';
import { LayoutDashboard, School, Calendar, FileText, Settings } from 'lucide-react';
import { cn } from '../../../lib/utils';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Applications', path: '/applications', icon: School },
  { name: 'Deadlines', path: '/deadlines', icon: Calendar },
  { name: 'Documents', path: '/documents', icon: FileText },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[60px] bg-card border-t border-border z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                {isActive && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[10px]">{item.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
