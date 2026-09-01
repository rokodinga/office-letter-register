import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';
import { AlertCircle, CheckCircle2, Lock, Mail } from 'lucide-react';
import { OfficeHeader } from '../components/OfficeHeader';
import { useAuth } from '../firebase/auth-context';

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setMessage('Password reset email sent. Please check your inbox and spam folder.');
    } catch (err) {
      if (err instanceof FirebaseError && err.code === 'auth/user-not-found') {
        setError('No account was found with that email address.');
      } else {
        setError(err instanceof FirebaseError ? err.message : 'Unable to send the reset email.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-6 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(37,99,235,0.35),transparent_35%),radial-gradient(circle_at_85%_85%,rgba(16,185,129,0.2),transparent_30%)]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col justify-center">
        <OfficeHeader className="mb-5 sm:mb-6" />
        <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl shadow-black/25">
          <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500" />
          <div className="p-6 sm:p-8">
        <div className="text-center mb-7">
          <div className="mx-auto w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
            <Lock className="text-blue-700" size={28} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 mt-4">Forgot Password?</h1>
          <p className="text-gray-600 mt-2">Enter your registered email and we'll send you a reset link.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-2">Email Address</span>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900" />
            </div>
          </label>

          {message && <div className="flex gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700"><CheckCircle2 size={20} className="shrink-0" /><p className="text-sm">{message}</p></div>}
          {error && <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"><AlertCircle size={20} className="shrink-0" /><p className="text-sm">{error}</p></div>}

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg">
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 text-center text-gray-600">
          Remember your password? <Link to="/login" className="text-blue-600 font-semibold">Sign in</Link>
        </div>
          </div>
        </div>
        <p className="mt-5 text-center text-xs font-medium text-slate-400">Password recovery is handled securely through Firebase Authentication.</p>
      </div>
    </div>
  );
}
