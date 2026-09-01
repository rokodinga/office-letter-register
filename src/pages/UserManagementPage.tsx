import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, KeyRound, Shield, UserCheck, UserX, Trash2, LogOut, X, Plus, UserPlus } from 'lucide-react';
import { auth } from '../firebase/config';
import { ProfileAvatar } from '../components/ProfileAvatar';
import type { UserRole, UserStatus } from '../firebase/auth-context';

interface ManagedUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string | null;
  lastSignInTime: string | null;
}

interface NewUserForm {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  photoURL: string;
}

async function adminRequest(path: string, options: RequestInit = {}) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Your session has expired. Please sign in again.');
  const token = await currentUser.getIdToken();
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Administrator request failed.');
  return body;
}

function formatDate(value: string | null) {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString();
}

const emptyNewUser: NewUserForm = {
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'User',
  photoURL: '',
};

export function UserManagementPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [newUser, setNewUser] = useState<NewUserForm>(emptyNewUser);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadUsers = async () => {
    setLoading(true); setError('');
    try {
      const result = await adminRequest('/api/admin/users');
      setUsers(result.users as ManagedUser[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load users.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadUsers(); }, []);

  const updateUser = async (uid: string, changes: { role?: UserRole; status?: UserStatus }) => {
    setBusyUid(uid); setMessage(''); setError('');
    try {
      await adminRequest('/api/admin/users', { method: 'PATCH', body: JSON.stringify({ uid, ...changes }) });
      setMessage('User updated successfully.');
      await loadUsers();
      setSelectedUser(current => current?.uid === uid ? { ...current, ...changes } : current);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update this user.');
    } finally { setBusyUid(''); }
  };

  const adminAction = async (uid: string, action: 'revokeSessions' | 'delete') => {
    const target = users.find((item) => item.uid === uid);
    if (!target) return;
    const prompt = action === 'delete'
      ? `Permanently delete ${target.displayName || target.email}? This removes the Firebase Authentication account and profile.`
      : `Sign out ${target.displayName || target.email} from all active sessions?`;
    if (!window.confirm(prompt)) return;

    setBusyUid(uid); setMessage(''); setError('');
    try {
      await adminRequest('/api/admin/users', { method: 'POST', body: JSON.stringify({ uid, action }) });
      setMessage(action === 'delete' ? 'User deleted successfully.' : 'All user sessions were revoked.');
      setSelectedUser(current => current?.uid === uid ? null : current);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Administrator action failed.');
    } finally { setBusyUid(''); }
  };

  const handleCreateUser = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');

    const displayName = newUser.displayName.trim();
    const email = newUser.email.trim();
    const password = newUser.password;

    if (!displayName) {
      setError('Full name is required.');
      return;
    }
    if (!email || !email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== newUser.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setCreatingUser(true);
    try {
      const result = await adminRequest('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          action: 'createUser',
          displayName,
          email,
          password,
          role: newUser.role,
          photoURL: newUser.photoURL.trim(),
        }),
      });

      setMessage(`User ${result.user?.displayName || displayName} created successfully.`);
      setNewUser(emptyNewUser);
      setCreateModalOpen(false);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create user.');
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-6">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-3" aria-label="Office Letter Register dashboard">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/f/fe/Seal_of_Odisha.png"
                alt="Government of Odisha emblem"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold text-blue-950 sm:text-base">Forest, Environment &amp; Climate Change Department</div>
              <div className="truncate text-xs font-semibold text-slate-500 sm:text-sm">Forest Range Office, Kodinga</div>
            </div>
          </Link>
          <Link to="/dashboard" className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-50"><ArrowLeft size={18} /> <span className="hidden sm:inline">Dashboard</span></Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3"><Shield className="text-blue-700" size={30} /><h1 className="text-3xl font-bold text-slate-900">User Management</h1></div>
            <p className="text-slate-600 mt-2">Manage accounts, roles, access and active sessions.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white border rounded-lg px-4 py-3 text-sm"><span className="text-slate-500">Total users</span><strong className="ml-2 text-slate-900">{users.length}</strong></div>
            <button
              type="button"
              onClick={() => { setMessage(''); setError(''); setNewUser(emptyNewUser); setCreateModalOpen(true); }}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold shadow-sm"
            >
              <Plus size={18} /> Create New User
            </button>
          </div>
        </div>

        {message && <div className="mb-5 flex gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700"><CheckCircle2 size={20} /><span>{message}</span></div>}
        {error && <div className="mb-5 flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"><AlertCircle size={20} /><span>{error}</span></div>}

        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          {loading ? <div className="p-10 text-center text-slate-500">Loading users...</div> : users.length === 0 ? <div className="p-10 text-center text-slate-500">No users found.</div> : (
            <table className="w-full min-w-[1180px] text-left">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-5 py-4 text-sm font-bold text-slate-700">User</th>
                  <th className="px-5 py-4 text-sm font-bold text-slate-700">Role</th>
                  <th className="px-5 py-4 text-sm font-bold text-slate-700">Status</th>
                  <th className="px-5 py-4 text-sm font-bold text-slate-700">Verification</th>
                  <th className="px-5 py-4 text-sm font-bold text-slate-700">Last sign-in</th>
                  <th className="px-5 py-4 text-sm font-bold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((item) => {
                  return (
                    <tr key={item.uid} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <ProfileAvatar photoURL={item.photoURL} name={item.displayName || item.email} size="md" />
                          <div><div className="font-semibold text-slate-900">{item.displayName || 'Unnamed user'}</div><div className="text-sm text-slate-500">{item.email}</div></div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><select disabled={busyUid === item.uid} value={item.role || 'User'} onChange={(e) => void updateUser(item.uid, { role: e.target.value as UserRole })} className="border rounded-lg px-3 py-2 bg-white text-slate-900"><option value="User">User</option><option value="Administrator">Administrator</option></select></td>
                      <td className="px-5 py-4"><span className={item.status === 'disabled' ? 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700' : 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700'}>{item.status === 'disabled' ? <UserX size={14} /> : <UserCheck size={14} />}{item.status === 'disabled' ? 'Disabled' : 'Active'}</span></td>
                      <td className="px-5 py-4 text-sm">{item.emailVerified ? <span className="text-green-700 font-semibold">Verified</span> : <span className="text-amber-700 font-semibold">Not verified</span>}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{formatDate(item.lastSignInTime)}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button disabled={busyUid === item.uid} onClick={() => setSelectedUser(item)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold"><Eye size={14} />View profile</button>
                          {item.status === 'disabled' ? <button disabled={busyUid === item.uid} onClick={() => void updateUser(item.uid, { status: 'active' })} className="px-3 py-2 rounded-lg bg-green-600 disabled:bg-green-300 text-white text-sm font-semibold">Activate</button> : <button disabled={busyUid === item.uid} onClick={() => void updateUser(item.uid, { status: 'disabled' })} className="px-3 py-2 rounded-lg bg-red-600 disabled:bg-red-300 text-white text-sm font-semibold">Disable</button>}
                          <button disabled={busyUid === item.uid} onClick={() => void adminAction(item.uid, 'revokeSessions')} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-700 disabled:bg-slate-300 text-white text-sm font-semibold"><LogOut size={14} />Sign out all</button>
                          <button disabled={busyUid === item.uid} onClick={() => void adminAction(item.uid, 'delete')} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-red-800 disabled:bg-red-300 text-white text-sm font-semibold"><Trash2 size={14} />Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-4 flex gap-2 items-start text-sm text-slate-500"><KeyRound size={17} className="mt-0.5 shrink-0" /><p>Password reset remains available through the user's email reset flow. The administrator panel handles profile viewing, account access, role, deletion and session revocation.</p></div>
      </main>

      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !creatingUser) setCreateModalOpen(false); }}>
          <section className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center"><UserPlus size={20} /></div>
                <div><h2 className="text-xl font-bold text-slate-900">Create New User</h2><p className="text-sm text-slate-500">Create a Firebase account and register its profile.</p></div>
              </div>
              <button type="button" onClick={() => { if (!creatingUser) setCreateModalOpen(false); }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-50" aria-label="Close"><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <label className="block">
                  <span className="block text-sm font-semibold text-slate-700 mb-2">Full Name *</span>
                  <input autoFocus required value={newUser.displayName} onChange={(e) => setNewUser(current => ({ ...current, displayName: e.target.value }))} className="w-full border rounded-lg px-4 py-3 text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter full name" />
                </label>
                <label className="block">
                  <span className="block text-sm font-semibold text-slate-700 mb-2">Email Address *</span>
                  <input required type="email" value={newUser.email} onChange={(e) => setNewUser(current => ({ ...current, email: e.target.value }))} className="w-full border rounded-lg px-4 py-3 text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="user@example.com" />
                </label>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <label className="block">
                  <span className="block text-sm font-semibold text-slate-700 mb-2">Password *</span>
                  <input required type="password" minLength={6} value={newUser.password} onChange={(e) => setNewUser(current => ({ ...current, password: e.target.value }))} className="w-full border rounded-lg px-4 py-3 text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="At least 6 characters" />
                </label>
                <label className="block">
                  <span className="block text-sm font-semibold text-slate-700 mb-2">Confirm Password *</span>
                  <input required type="password" minLength={6} value={newUser.confirmPassword} onChange={(e) => setNewUser(current => ({ ...current, confirmPassword: e.target.value }))} className="w-full border rounded-lg px-4 py-3 text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Re-enter password" />
                </label>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <label className="block">
                  <span className="block text-sm font-semibold text-slate-700 mb-2">Role *</span>
                  <select value={newUser.role} onChange={(e) => setNewUser(current => ({ ...current, role: e.target.value as UserRole }))} className="w-full border rounded-lg px-4 py-3 text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="User">User</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                </label>
                <label className="block">
                  <span className="block text-sm font-semibold text-slate-700 mb-2">Profile Photo URL <span className="font-normal text-slate-400">(optional)</span></span>
                  <input value={newUser.photoURL} onChange={(e) => setNewUser(current => ({ ...current, photoURL: e.target.value }))} className="w-full border rounded-lg px-4 py-3 text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Google Drive sharing URL or image URL" />
                </label>
              </div>

              <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800">
                The new account is created without signing you out. The user's email remains unverified until the normal email-verification flow is completed.
              </div>
              {error && <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex gap-2"><AlertCircle size={18} className="shrink-0 mt-0.5" /><span>{error}</span></div>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { if (!creatingUser) setCreateModalOpen(false); }} disabled={creatingUser} className="px-5 py-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold">Cancel</button>
                <button type="submit" disabled={creatingUser} className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold">
                  <UserPlus size={18} />{creatingUser ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedUser(null); }}>
          <section className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div><h2 className="text-xl font-bold text-slate-900">User Profile</h2><p className="text-sm text-slate-500">Account details and access information</p></div>
              <button onClick={() => setSelectedUser(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Close"><X size={20} /></button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <ProfileAvatar photoURL={selectedUser.photoURL} name={selectedUser.displayName || selectedUser.email} size="lg" />
                <div><h3 className="text-2xl font-bold text-slate-900">{selectedUser.displayName || 'Unnamed user'}</h3><p className="text-slate-500 break-all">{selectedUser.email}</p></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-lg bg-slate-50 p-4"><span className="text-xs text-slate-500">Role</span><p className="font-semibold text-slate-900 mt-1">{selectedUser.role === 'Administrator' ? 'Administrator' : 'User'}</p></div>
                <div className="rounded-lg bg-slate-50 p-4"><span className="text-xs text-slate-500">Status</span><p className={`font-semibold mt-1 ${selectedUser.status === 'disabled' ? 'text-red-700' : 'text-green-700'}`}>{selectedUser.status === 'disabled' ? 'Disabled' : 'Active'}</p></div>
                <div className="rounded-lg bg-slate-50 p-4"><span className="text-xs text-slate-500">Email verification</span><p className={`font-semibold mt-1 ${selectedUser.emailVerified ? 'text-green-700' : 'text-amber-700'}`}>{selectedUser.emailVerified ? 'Verified' : 'Not verified'}</p></div>
                <div className="rounded-lg bg-slate-50 p-4"><span className="text-xs text-slate-500">Last sign-in</span><p className="font-semibold text-slate-900 mt-1">{formatDate(selectedUser.lastSignInTime)}</p></div>
              </div>
              <div className="mt-4 rounded-lg bg-slate-50 p-4"><span className="text-xs text-slate-500">Account created</span><p className="font-semibold text-slate-900 mt-1">{formatDate(selectedUser.createdAt)}</p></div>
              <div className="mt-4"><span className="text-xs text-slate-500">Firebase User ID</span><p className="font-mono text-xs text-slate-700 break-all mt-1">{selectedUser.uid}</p></div>
              <div className="mt-6 flex justify-end"><button onClick={() => setSelectedUser(null)} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold">Close</button></div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
