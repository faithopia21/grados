import { useLocation, useNavigate } from 'react-router';
import { LayoutDashboard, School, Calendar, FileText, Settings } from 'lucide-react';
import { cn } from '../../../lib/utils';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, tourId: undefined },
  { name: 'Applications', path: '/applications', icon: School, tourId: 'tour-nav-applications' },
  { name: 'Deadlines', path: '/deadlines', icon: Calendar, tourId: 'tour-nav-deadlines' },
  { name: 'Documents', path: '/documents', icon: FileText, tourId: 'tour-nav-documents' },
  { name: 'Settings', path: '/settings', icon: Settings, tourId: 'tour-nav-settings' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[60px] bg-card border-t border-border z-50">
      <div className="flex items-center justify-around h-full px-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            (item.path === '/dashboard' && location.pathname === '/');

          return (
            <button
              key={item.path}
              id={item.tourId}
              type="button"
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-h-[44px] transition-colors relative',
                isActive ? 'text-[#4F46E5]' : 'text-muted-foreground'
              )}
            >
              {isActive && (
                <span className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#4F46E5]" />
              )}
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
