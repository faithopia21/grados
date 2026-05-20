import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Sun, Moon, LogOut } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Button } from '../ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';

interface MobileHeaderProps {
  pageName: string;
}

export function MobileHeader({ pageName }: MobileHeaderProps) {
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/signin');
  };

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 h-[52px] bg-card border-b border-border z-50 flex items-center justify-between px-4">
        {/* Logo */}
        <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: '#4F46E5' }}>
          <span className="text-white text-sm font-medium">G</span>
        </div>

        {/* Page Name */}
        <h2 className="text-[15px] font-medium">{pageName}</h2>

        {/* Theme Toggle & Avatar */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium"
          >
            JD
          </button>
        </div>
      </header>

      {/* User Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent side="bottom" className="h-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Account</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-4">
            <div className="pb-4 border-b border-border">
              <p className="font-medium">John Doe</p>
              <p className="text-sm text-muted-foreground">john.doe@email.com</p>
            </div>
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  setIsDrawerOpen(false);
                  navigate('/settings');
                }}
              >
                Settings & Profile
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-[#DC2626] hover:text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={() => {
                  setIsDrawerOpen(false);
                  handleSignOut();
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
