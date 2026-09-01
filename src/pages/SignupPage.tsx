import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../firebase/auth-context';
import { Mail, Lock, AlertCircle, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { OfficeHeader } from '../components/OfficeHeader';
import { FirebaseError } from 'firebase/app';

export function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!displayName.trim()) {
      setError('Full name is required');
      return;
    }

    setLoading(true);
    try {
      await signup(email, password, displayName);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof FirebaseError ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-6 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(37,99,235,0.35),transparent_35%),radial-gradient(circle_at_85%_85%,rgba(16,185,129,0.2),transparent_30%)]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col justify-center">
        <OfficeHeader className="mb-5 sm:mb-6" />

        <div className="mx-auto w-full max-w-lg overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl shadow-black/25">
          <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500" />
          <div className="p-6 sm:p-8">
            <div className="mb-7 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <ShieldCheck size={23} />
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">Create your account</h2>
              <p className="mt-1.5 text-sm text-slate-500">Set up access to the Office Letter Register</p>
            </div>

        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={20} />
              <input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Full Name" className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters" className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
              <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password" className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="text-red-600" size={20} />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 hover:shadow-xl disabled:bg-blue-400">
            {loading ? 'Creating account...' : <>Create Account <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" /></>}
          </button>
        </form>

        <div className="mt-6 text-center text-gray-600">
          Already have an account? <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">Sign in</Link>
          <div className="mt-4 flex justify-center gap-4 text-sm">
            <Link to="/privacy" className="text-blue-600 hover:text-blue-800">Privacy Policy</Link>
            <Link to="/terms" className="text-blue-600 hover:text-blue-800">Terms of Service</Link>
          </div>
        </div>
          </div>
        </div>
        <p className="mt-5 text-center text-xs font-medium text-slate-400">Account creation is subject to office access policies.</p>
      </div>
    </div>
  );
}
