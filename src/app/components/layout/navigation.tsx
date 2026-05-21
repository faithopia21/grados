import { Link, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  School,
  FileText,
  Settings,
  Calendar,
  LogOut,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { ThemeToggle } from '../theme-toggle';
import { supabase } from '../../../lib/supabase';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../ui/tooltip';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Applications', path: '/applications', icon: School },
  { name: 'Deadlines', path: '/deadlines', icon: Calendar },
  { name: 'Documents', path: '/documents', icon: FileText },
  { name: 'Settings', path: '/settings', icon: Settings },
];

interface NavigationProps {
  tabletOverlayOpen?: boolean;
  onTabletOverlayClose?: () => void;
}

export function Navigation({
  tabletOverlayOpen = false,
  onTabletOverlayClose,
}: NavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/signin');
  };

  const closeOverlay = () => onTabletOverlayClose?.();

  return (
    <>
      {tabletOverlayOpen && (
        <div
          className="hidden md:block lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeOverlay}
          aria-hidden
        />
      )}

      <nav
        className={cn(
          'hidden md:flex fixed md:sticky top-0 h-screen border-r border-border bg-card flex-col z-50 transition-all duration-300',
          'md:w-16 lg:w-60',
          tabletOverlayOpen
            ? 'md:w-60 md:shadow-xl'
            : 'md:translate-x-0'
        )}
      >
        <div className="p-4 border-b border-border flex items-center justify-center lg:justify-start lg:px-6 lg:py-6">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 lg:hidden"
            style={{ backgroundColor: '#4F46E5' }}
          >
            <span className="text-white text-sm font-medium">G</span>
          </div>
          <div className="hidden lg:block min-w-0">
            <h1 className="text-xl text-foreground">GradOS</h1>
            <p className="text-xs text-muted-foreground mt-1">Graduate Application OS</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1 px-2 lg:px-3">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                (item.path === '/dashboard' && location.pathname === '/');

              const link = (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeOverlay}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors min-h-[44px]',
                    'md:justify-center lg:justify-start',
                    isActive
                      ? 'bg-[--primary-light] text-primary border-l-2 border-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden lg:inline">{item.name}</span>
                </Link>
              );

              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild className="md:flex lg:contents w-full">
                    {link}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="lg:hidden">
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              );
            })}

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors w-full min-h-[44px]',
                    'md:justify-center lg:justify-start',
                    'text-muted-foreground hover:bg-red-50 hover:text-[#DC2626] dark:hover:bg-red-950/30'
                  )}
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span className="hidden lg:inline">Sign Out</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="lg:hidden">
                Sign Out
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="p-2 lg:p-3 border-t border-border flex items-center justify-center lg:justify-between lg:px-3">
          <span className="hidden lg:inline text-xs text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
      </nav>
    </>
  );
}
