import { Link, useLocation } from 'react-router';
import { useState } from 'react';
import {
  LayoutDashboard,
  User,
  School,
  FileText,
  Settings,
  Calendar,
  Menu,
  X
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { ThemeToggle } from '../theme-toggle';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Applications', path: '/applications', icon: School },
  { name: 'Deadlines', path: '/deadlines', icon: Calendar },
  { name: 'Documents', path: '/documents', icon: FileText },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export function Navigation() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-lg">GradOS</h1>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        className={cn(
          'hidden md:flex fixed md:sticky top-0 h-screen border-r border-border bg-card flex-col z-40 transition-all duration-300',
          'md:w-64 lg:w-64',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="p-6 border-b border-border mt-16 md:mt-0">
          <h1 className="text-xl text-foreground">GradOS</h1>
          <p className="text-xs text-muted-foreground mt-1">Graduate Application OS</p>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-[--primary-light] text-primary border-l-2 border-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="p-3 border-t border-border space-y-1">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </>
  );
}
