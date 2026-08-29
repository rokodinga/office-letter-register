import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, orderBy, query, updateDoc, doc } from 'firebase/firestore';
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Shield, UserCheck, UserX } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import type { UserProfile, UserRole, UserStatus } from '../firebase/auth-context';

export function UserManagementPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const usersQuery = query(collection(db, 'users'), orderBy('displayName'));
    return onSnapshot(usersQuery, (snapshot) => {
      setUsers(snapshot.docs.map((item) => item.data() as UserProfile));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError('Unable to load users. Check Firestore security rules.');
      setLoading(false);
    });
  }, []);

  const updateUser = async (uid: string, changes: { role?: UserRole; status?: UserStatus }) => {
    setMessage(''); setError('');
    try {
      await updateDoc(doc(db, 'users', uid), changes);
      setMessage('User updated successfully.');
    } catch (err) {
      console.error(err);
      setError('Unable to update this user. Make sure you have administrator permission.');
    }
  };

  const resetPassword = async (email: string) => {
    setMessage(''); setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent to ' + email + '.');
    } catch (err) {
      console.error(err);
      setError('Unable to send the password reset email.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/dashboard" className="text-2xl font-bold text-blue-900">Office Letter Register</Link>
          <Link to="/dashboard" className="flex items-center gap-2 text-blue-600 font-semibold"><ArrowLeft size={18} /> Dashboard</Link>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3"><Shield className="text-blue-700" size={30} /><h1 className="text-3xl font-bold text-slate-900">User Management</h1></div>
            <p className="text-slate-600 mt-2">Manage registered users, roles and account access.</p>
          </div>
          <div className="bg-white border rounded-lg px-4 py-3 text-sm"><span className="text-slate-500">Total users</span><strong className="ml-2 text-slate-900">{users.length}</strong></div>
        </div>

        {message && <div className="mb-5 flex gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700"><CheckCircle2 size={20} /><span>{message}</span></div>}
        {error && <div className="mb-5 flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"><AlertCircle size={20} /><span>{error}</span></div>}

        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          {loading ? <div className="p-10 text-center text-slate-500">Loading users...</div> : users.length === 0 ? <div className="p-10 text-center text-slate-500">No user profiles found.</div> : (
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-5 py-4 text-sm font-bold text-slate-700">User</th>
                  <th className="px-5 py-4 text-sm font-bold text-slate-700">Role</th>
                  <th className="px-5 py-4 text-sm font-bold text-slate-700">Status</th>
                  <th className="px-5 py-4 text-sm font-bold text-slate-700">User ID</th>
                  <th className="px-5 py-4 text-sm font-bold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((item) => (
                  <tr key={item.uid} className="hover:bg-slate-50">
                    <td className="px-5 py-4"><div className="flex items-center gap-3">{item.photoURL ? <img src={item.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold">{(item.displayName || item.email || 'U').charAt(0).toUpperCase()}</div>}<div><div className="font-semibold text-slate-900">{item.displayName || 'Unnamed user'}</div><div className="text-sm text-slate-500">{item.email}</div></div></div></td>
                    <td className="px-5 py-4"><select value={item.role || 'user'} onChange={(e) => updateUser(item.uid, { role: e.target.value as UserRole })} className="border rounded-lg px-3 py-2 bg-white text-slate-900"><option value="user">User</option><option value="admin">Administrator</option></select></td>
                    <td className="px-5 py-4"><span className={item.status === 'disabled' ? 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700' : 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700'}>{item.status === 'disabled' ? <UserX size={14} /> : <UserCheck size={14} />}{item.status === 'disabled' ? 'Disabled' : 'Active'}</span></td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-500 max-w-[180px] truncate">{item.uid}</td>
                    <td className="px-5 py-4"><div className="flex flex-wrap gap-2">{item.status === 'disabled' ? <button onClick={() => updateUser(item.uid, { status: 'active' })} className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold">Activate</button> : <button onClick={() => updateUser(item.uid, { status: 'disabled' })} className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold">Disable</button>}<button onClick={() => resetPassword(item.email)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 text-white text-sm font-semibold"><KeyRound size={14} />Reset password</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="mt-4 text-sm text-slate-500">Disabling an account prevents it from using this application. Firebase Authentication credentials are not deleted from this client-side admin panel.</p>
      </main>
    </div>
  );
}
