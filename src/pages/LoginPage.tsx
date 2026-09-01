import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../firebase/auth-context';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { FirebaseError } from 'firebase/app';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof FirebaseError ? err.message : 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-800 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-4xl mb-6 px-2">
          <div className="flex items-center justify-center gap-4 text-center">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/f/fe/Seal_of_Odisha.png"
              alt="Government of Odisha emblem"
              className="h-16 w-16 object-contain shrink-0"
            />
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight text-white">
                Forest, Environment &amp; Climate Change Department Govt of Odisha
              </h1>
              <p className="mt-1 text-sm sm:text-base md:text-lg font-semibold text-blue-100">
                Forest Range Office, Kodinga
              </p>
            </div>
          </div>
        </div>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Office Letter Register</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900" required />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 font-semibold">Forgot password?</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password" className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900" required />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="text-red-600" size={20} />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-lg">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">Don't have an account? <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-semibold">Sign up</Link></p>
          <div className="mt-4 flex justify-center gap-4 text-sm">
            <Link to="/privacy" className="text-blue-600 hover:text-blue-800">Privacy Policy</Link>
            <Link to="/terms" className="text-blue-600 hover:text-blue-800">Terms of Service</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
