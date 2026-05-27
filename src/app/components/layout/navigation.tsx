import { Link, useLocation, useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  School,
  FileText,
  Settings,
  Calendar,
  LogOut,
  Moon,
  Sun,
  GraduationCap,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { ThemeToggle } from '../theme-toggle';
import gradosLogo from '../../../assets/logo.svg';
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
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
    const initialTheme = savedTheme || systemTheme;
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/signin');
  };

  const closeOverlay = () => onTabletOverlayClose?.();

  const isNavActive = (path: string) =>
    location.pathname === path ||
    (path === '/dashboard' && location.pathname === '/');

  // Desktop (lg+): full row with icon + text
  const desktopLinkClass = (isActive: boolean) =>
    cn(
      'flex flex-row items-center gap-3 w-full px-4 py-2.5 rounded-lg transition-colors min-h-[44px]',
      'text-[13px] font-medium',
      isActive
        ? 'bg-[#EEF2FF] text-[#4F46E5] border-l-2 border-[#4F46E5] dark:bg-indigo-950/40'
        : 'text-[#888780] hover:bg-accent/60'
    );

  // Tablet (md, not lg): icon-only centered
  const tabletLinkClass = (isActive: boolean) =>
    cn(
      'flex items-center justify-center w-full min-h-[44px] rounded-lg transition-colors',
      isActive
        ? 'bg-[--primary-light] text-primary border-l-2 border-primary'
        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
    );

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
          'md:w-16 lg:w-[240px]',
          tabletOverlayOpen ? 'md:w-60 md:shadow-xl' : 'md:translate-x-0'
        )}
      >
        {/* Logo / Brand */}
        <div className="p-4 border-b border-border flex items-center justify-center lg:justify-start lg:px-6 lg:py-6">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 lg:hidden"
            style={{ backgroundColor: '#4F46E5' }}
          >
            <GraduationCap size={20} className="text-white" />
          </div>
          <div className="hidden lg:block min-w-0">
            <img 
              src={gradosLogo} 
              alt="GradOS"
              className="h-13 w-auto object-contain"
            />
          </div>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1 px-2 lg:px-3">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = isNavActive(item.path);

              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild className="w-full">
                    {/* Desktop: icon + text in a row. Tablet: icon only, centered */}
                    <Link
                      to={item.path}
                      onClick={closeOverlay}
                      className={cn(
                        // Shared base
                        'transition-colors min-h-[44px] rounded-lg w-full',
                        // Tablet (md, not lg): icon-only centered
                        'md:flex md:items-center md:justify-center md:px-0 md:py-2.5',
                        // Desktop (lg+): row with icon + text
                        'lg:flex lg:flex-row lg:items-center lg:gap-3 lg:px-4 lg:py-2.5 lg:justify-start',
                        isActive
                          ? cn(
                              'lg:bg-[#EEF2FF] lg:text-[#4F46E5] lg:border-l-2 lg:border-[#4F46E5]',
                              'dark:lg:bg-indigo-950/40',
                              'md:bg-[--primary-light] md:text-primary md:border-l-2 md:border-primary'
                            )
                          : cn(
                              'lg:text-[#888780] lg:hover:bg-accent/60',
                              'md:text-muted-foreground md:hover:bg-accent md:hover:text-accent-foreground'
                            )
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 lg:h-5 lg:w-5" />
                      {/* Always visible on desktop (lg+), hidden on tablet (md) */}
                      <span className="hidden lg:inline text-[13px] font-medium">{item.name}</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="lg:hidden">
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Tablet bottom: icon-only theme + sign out */}
        <div className="md:flex lg:hidden flex-col border-t border-border p-2 items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex justify-center w-full">
                <ThemeToggle />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">Theme</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleSignOut}
                className={cn(
                  'flex items-center justify-center w-full min-h-[44px] rounded-lg transition-colors',
                  'text-muted-foreground hover:bg-red-50 hover:text-[#DC2626] dark:hover:bg-red-950/30'
                )}
              >
                <LogOut className="h-4 w-4 shrink-0" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Sign Out</TooltipContent>
          </Tooltip>
        </div>

        {/* Desktop bottom: theme row + sign out row */}
        <div className="hidden lg:flex flex-col border-t border-border">
          <div className="px-3 pt-3 pb-2 space-y-1">
            <button
              type="button"
              onClick={toggleTheme}
              className={cn(
                'flex flex-row items-center gap-3 w-full px-4 py-2.5 rounded-lg min-h-[44px]',
                'text-[13px] font-medium text-[#888780] hover:bg-accent/60 transition-colors'
              )}
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5 shrink-0" />
              ) : (
                <Sun className="h-5 w-5 shrink-0" />
              )}
              <span>Theme</span>
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className={cn(
                'flex flex-row items-center gap-3 w-full px-4 py-2.5 rounded-lg min-h-[44px]',
                'text-[13px] font-medium text-[#888780] transition-colors',
                'hover:bg-red-50 hover:text-[#DC2626] dark:hover:bg-red-950/30'
              )}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
