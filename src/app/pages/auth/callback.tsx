import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const completeSignIn = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        setError(sessionError?.message || 'Could not establish session. Please try again.');
        return;
      }

      const user = session.user;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!profile) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: user.id,
          full_name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            '',
        });

        if (profileError) {
          setError(profileError.message);
          return;
        }
      }

      navigate('/dashboard', { replace: true });
    };

    completeSignIn();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F8F8] dark:bg-background p-4">
      {error ? (
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
          <button
            type="button"
            onClick={() => navigate('/signin', { replace: true })}
            className="text-sm hover:underline"
            style={{ color: '#4F46E5' }}
          >
            Back to sign in
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#4F46E5' }} />
          <p className="text-sm">Signing you in...</p>
        </div>
      )}
    </div>
  );
}
