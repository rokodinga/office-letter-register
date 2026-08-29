import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';
import { CheckCircle2, Lock, Mail, Save, UserCircle } from 'lucide-react';
import { useAuth } from '../firebase/auth-context';

export function ProfilePage() {
  const { user, updateUserProfile, changeEmail, changePassword } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName || '');
    setEmail(user.email || '');
    setPhotoURL(user.photoURL || '');
  }, [user]);

  if (!user) {
    navigate('/login');
    return null;
  }

  const friendlyError = (err: unknown) => {
    if (err instanceof FirebaseError) {
      if (err.code === 'auth/requires-recent-login') return 'For security, sign in again before changing this account setting.';
      if (err.code === 'auth/email-already-in-use') return 'That email address is already in use.';
      if (err.code === 'auth/invalid-credential') return 'Current password is incorrect.';
      return err.message;
    }
    return err instanceof Error ? err.message : 'Something went wrong.';
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');
    if (!displayName.trim()) {
      setError('Full name is required.');
      return;
    }

    setSavingProfile(true);
    try {
      await updateUserProfile(displayName, photoURL);
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const saveSecurity = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (email.trim() === (user.email || '') && !newPassword) {
      setError('Enter a new email or a new password.');
      return;
    }
    if (newPassword && newPassword !== confirmNewPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setSavingSecurity(true);
    try {
      if (email.trim() !== (user.email || '')) {
        await changeEmail(email, currentPassword);
      }
      if (newPassword) {
        await changePassword(currentPassword, newPassword);
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setMessage('Account security settings updated successfully.');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSavingSecurity(false);
    }
  };

  const initials = (user.displayName || user.email || 'U').trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/dashboard" className="text-2xl font-bold text-blue-900">Office Letter Register</Link>
          <Link to="/dashboard" className="text-blue-600 font-semibold">Dashboard</Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
          <p className="text-slate-600 mt-1">View and manage your Office Letter Register account.</p>
        </div>

        {message && <div className="mb-5 flex gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700"><CheckCircle2 size={20} /><span>{message}</span></div>}
        {error && <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

        <div className="grid lg:grid-cols-3 gap-6">
          <section className="bg-white rounded-xl shadow-sm border p-6 h-fit">
            <div className="flex flex-col items-center text-center">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-blue-100" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-4xl font-bold">{initials}</div>
              )}
              <h2 className="text-xl font-bold text-slate-900 mt-4">{user.displayName || 'User'}</h2>
              <p className="text-slate-500 break-all">{user.email}</p>
              <div className="mt-5 w-full text-left space-y-3 text-sm">
                <div><span className="text-slate-500">Account status</span><p className="font-semibold text-green-700">Active</p></div>
                <div><span className="text-slate-500">User ID</span><p className="font-mono text-xs break-all text-slate-700">{user.uid}</p></div>
                <div><span className="text-slate-500">Email verified</span><p className="font-semibold">{user.emailVerified ? 'Yes' : 'No'}</p></div>
              </div>
            </div>
          </section>

          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-5"><UserCircle className="text-blue-600" /><div><h2 className="text-xl font-bold text-slate-900">Profile Information</h2><p className="text-sm text-slate-500">Update how your name appears in the system.</p></div></div>
              <form onSubmit={saveProfile} className="space-y-5">
                <label className="block"><span className="block text-sm font-semibold text-slate-700 mb-2">Full Name *</span><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="w-full border rounded-lg px-4 py-3 text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500" /></label>
                <label className="block"><span className="block text-sm font-semibold text-slate-700 mb-2">Profile Photo URL <span className="font-normal text-slate-400">(optional)</span></span><input value={photoURL} onChange={(e) => setPhotoURL(e.target.value)} placeholder="https://..." className="w-full border rounded-lg px-4 py-3 text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500" /></label>
                <button disabled={savingProfile} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-3 rounded-lg font-semibold"><Save size={18} />{savingProfile ? 'Saving...' : 'Save Profile'}</button>
              </form>
            </section>

            <section className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-5"><Lock className="text-blue-600" /><div><h2 className="text-xl font-bold text-slate-900">Account & Security</h2><p className="text-sm text-slate-500">Changing email or password requires your current password.</p></div></div>
              <form onSubmit={saveSecurity} className="space-y-5">
                <label className="block"><span className="block text-sm font-semibold text-slate-700 mb-2">Email Address</span><div className="relative"><Mail className="absolute left-3 top-3 text-slate-400" size={19} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded-lg pl-10 pr-4 py-3 text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500" /></div></label>
                <label className="block"><span className="block text-sm font-semibold text-slate-700 mb-2">Current Password</span><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Required for email/password changes" className="w-full border rounded-lg px-4 py-3 text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500" /></label>
                <div className="grid md:grid-cols-2 gap-5">
                  <label className="block"><span className="block text-sm font-semibold text-slate-700 mb-2">New Password</span><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 6 characters" className="w-full border rounded-lg px-4 py-3 text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500" /></label>
                  <label className="block"><span className="block text-sm font-semibold text-slate-700 mb-2">Confirm New Password</span><input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="w-full border rounded-lg px-4 py-3 text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500" /></label>
                </div>
                <button disabled={savingSecurity} className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white px-5 py-3 rounded-lg font-semibold"><Lock size={18} />{savingSecurity ? 'Updating...' : 'Update Security'}</button>
              </form>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
