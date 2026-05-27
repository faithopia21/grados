import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!navigator.onLine) {
      setError('No internet connection.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const { error } = await supabase.auth
      .resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth/reset-password'
      });
    
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    
    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F8F8] dark:bg-background p-4">
        <div className="w-full max-w-[420px] bg-card rounded-2xl p-10 border border-border">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check size={24} className="text-green-600" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Check your inbox</h2>
            <p className="text-sm text-muted-foreground mb-4">
              We sent a password reset link to <strong>{email}</strong>. It expires in 1 hour.
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Did not receive it? Check your spam folder or
            </p>
            <button 
              onClick={() => setSuccess(false)}
              className="text-sm text-indigo-600 hover:underline">
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F8F8] dark:bg-background p-4">
      <div className="w-full max-w-[420px] bg-card rounded-2xl p-10 border border-border">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl mb-2">Reset your password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-950 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/sign-in')}
            className="text-[13px] hover:underline"
            style={{ color: '#4F46E5' }}
          >
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
