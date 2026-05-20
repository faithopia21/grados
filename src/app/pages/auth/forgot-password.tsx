import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { CheckCircle2 } from 'lucide-react';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleSendResetLink = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSent(true);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F8F8] dark:bg-background p-4">
        <div className="w-full max-w-[420px] bg-card rounded-2xl p-10 border border-border">
          {/* Success State */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <h1 className="text-xl mb-2">Check your inbox</h1>
            <p className="text-sm text-muted-foreground mb-6">
              We've sent a reset link to your email address. It expires in 30 minutes.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => setEmailSent(false)}
                className="text-sm hover:underline"
                style={{ color: '#4F46E5' }}
              >
                Resend email
              </button>
              <div>
                <button
                  onClick={() => navigate('/sign-in')}
                  className="text-sm hover:underline"
                  style={{ color: '#4F46E5' }}
                >
                  Back to sign in
                </button>
              </div>
            </div>
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

        {/* Form */}
        <form onSubmit={handleSendResetLink} className="space-y-4">
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

          <Button type="submit" className="w-full h-11">
            Send reset link
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
