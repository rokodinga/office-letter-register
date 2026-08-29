import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../firebase/auth-context';

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-slate-100 flex items-center justify-center"><p className="text-slate-600">Checking administrator access...</p></div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (userProfile?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
