import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';
import { AlertCircle, CheckCircle2, Lock, Mail } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
            <Lock className="text-blue-700" size={28} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Forgot Password?</h1>
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
  );
}
