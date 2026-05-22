import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LogOut, User, Sun, Moon } from 'lucide-react';
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
  const [initials, setInitials] = useState('G');
  const [displayName, setDisplayName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains('dark')
  );

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserEmail(user.email ?? '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      const name =
        profile?.full_name ||
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        user.email ||
        '';

      setDisplayName(name);

      const parts = String(name).trim().split(/\s+/);
      if (parts.length >= 2) {
        setInitials(`${parts[0][0]}${parts[1][0]}`.toUpperCase());
      } else if (name) {
        setInitials(String(name).slice(0, 2).toUpperCase());
      } else {
        setInitials('G');
      }
    };

    loadUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/signin');
  };

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 h-[52px] bg-card border-b border-border z-50 flex items-center justify-between px-4">
        <div
          className="w-8 h-8 rounded flex items-center justify-center shrink-0"
          style={{ backgroundColor: '#4F46E5' }}
        >
          <span className="text-white text-sm font-medium">G</span>
        </div>

        <h2 className="text-[15px] font-medium flex-1 text-center truncate px-2">
          {pageName}
        </h2>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-accent transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium"
            aria-label="Open account menu"
          >
            {initials}
          </button>
        </div>
      </header>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent side="bottom" className="h-auto rounded-t-2xl pb-8">
          <SheetHeader className="text-left border-b border-border pb-4">
            <SheetTitle className="text-base font-semibold">
              {displayName || 'Account'}
            </SheetTitle>
            {userEmail && (
              <p className="text-sm text-muted-foreground font-normal">{userEmail}</p>
            )}
          </SheetHeader>

          <div className="py-2 space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start min-h-[44px] gap-2"
              onClick={() => {
                setIsDrawerOpen(false);
                navigate('/profile');
              }}
            >
              <User className="h-4 w-4" />
              Profile
            </Button>
          </div>

          <div className="border-t border-border pt-2 mt-2">
            <Button
              variant="ghost"
              className="w-full justify-start text-[#DC2626] hover:text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/30 min-h-[44px]"
              onClick={() => {
                setIsDrawerOpen(false);
                handleSignOut();
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
