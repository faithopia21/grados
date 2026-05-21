import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LogOut } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Button } from '../ui/button';
import { ThemeToggle } from '../theme-toggle';
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

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      const name =
        profile?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email ||
        'G';
      const parts = String(name).trim().split(/\s+/);
      if (parts.length >= 2) {
        setInitials(`${parts[0][0]}${parts[1][0]}`.toUpperCase());
      } else {
        setInitials(String(name).slice(0, 2).toUpperCase());
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

        <div className="flex items-center gap-1 shrink-0">
          <ThemeToggle />
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
        <SheetContent side="bottom" className="h-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Account</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start min-h-[44px]"
              onClick={() => {
                setIsDrawerOpen(false);
                navigate('/profile');
              }}
            >
              Profile
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start min-h-[44px]"
              onClick={() => {
                setIsDrawerOpen(false);
                navigate('/settings');
              }}
            >
              Settings
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-[#DC2626] hover:text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/30 min-h-[44px]"
              onClick={() => {
                setIsDrawerOpen(false);
                handleSignOut();
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
