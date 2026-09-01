import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { ArrowDownToLine, ArrowUpFromLine, FileText, LogOut, Mail, Plus, Search, Shield, UserCircle, Download } from 'lucide-react';
import { db } from '../firebase/config';
import { useAuth } from '../firebase/auth-context';

function resolveProfilePhotoUrl(value?: string | null): string {
  const raw = value?.trim() || '';
  if (!raw) return '';

  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase();

    // Firebase stores the original Google Drive sharing URL, while <img>
    // needs a directly renderable image URL.
    if (hostname === 'drive.google.com' || hostname === 'www.drive.google.com') {
      const pathMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
      const id = pathMatch?.[1] || url.searchParams.get('id');

      if (id) {
        return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w400`;
      }
    }

    return raw;
  } catch {
    return '';
  }
}

export function DashboardPage() {
  const { user, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [incomingCount, setIncomingCount] = useState(0);
  const [outgoingCount, setOutgoingCount] = useState(0);

  useEffect(() => {
    const unsubIncoming = onSnapshot(collection(db, 'incomingLetters'), (snapshot) => setIncomingCount(snapshot.size));
    const unsubOutgoing = onSnapshot(collection(db, 'outgoingLetters'), (snapshot) => setOutgoingCount(snapshot.size));
    return () => { unsubIncoming(); unsubOutgoing(); };
  }, []);

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const total = incomingCount + outgoingCount;
  const displayName = user?.displayName || userProfile?.displayName || user?.email?.split('@')[0] || 'User';
  const isAdmin = userProfile?.role === 'Administrator';
  const profilePhoto = resolveProfilePhotoUrl(user?.photoURL || userProfile?.photoURL);
  const initials = displayName.trim().charAt(0).toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap gap-4 justify-between items-center">
          <Link to="/dashboard" className="text-2xl font-bold text-blue-900">Office Letter Register</Link>
          <div className="flex items-center gap-3">
            <Link to="/profile" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100" title="View profile">
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt="Profile"
                  className="w-9 h-9 rounded-full object-cover border-2 border-blue-100"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                    const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <span
                className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 items-center justify-center text-sm font-bold"
                style={{ display: profilePhoto ? 'none' : 'flex' }}
                aria-hidden="true"
              >
                {initials}
              </span>
              <span className="hidden md:block text-left"><span className="block text-sm font-semibold text-slate-900">{displayName}</span><span className="block text-xs text-slate-500">View profile</span></span>
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg"><LogOut size={18} /> Sign Out</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Welcome, {displayName}</h1>
            <p className="text-slate-600 mt-1">
              {isAdmin ? 'Register, search and manage incoming and outgoing correspondence.' : 'View and search incoming and outgoing correspondence.'}
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-3">
              <Link to="/incoming" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"><Plus size={18} /> Incoming Letter</Link>
              <Link to="/outgoing" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold"><Plus size={18} /> Outgoing Letter</Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link to="/incoming" className="bg-blue-600 hover:bg-blue-700 rounded-xl shadow p-6 text-white transition">
            <div className="flex justify-between"><ArrowDownToLine size={28} /><span className="text-4xl font-bold">{incomingCount}</span></div>
            <h2 className="text-xl font-bold mt-5">Incoming Letters</h2>
            <p className="text-blue-100 mt-1">{isAdmin ? 'View and register received correspondence' : 'View received correspondence'}</p>
          </Link>
          <Link to="/outgoing" className="bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow p-6 text-white transition">
            <div className="flex justify-between"><ArrowUpFromLine size={28} /><span className="text-4xl font-bold">{outgoingCount}</span></div>
            <h2 className="text-xl font-bold mt-5">Outgoing Letters</h2>
            <p className="text-emerald-100 mt-1">{isAdmin ? 'View and register dispatched correspondence' : 'View dispatched correspondence'}</p>
          </Link>
          <div className="bg-purple-600 rounded-xl shadow p-6 text-white">
            <div className="flex justify-between"><FileText size={28} /><span className="text-4xl font-bold">{total}</span></div>
            <h2 className="text-xl font-bold mt-5">Total Records</h2>
            <p className="text-purple-100 mt-1">All letters currently registered</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Quick actions</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link to="/incoming" className="border rounded-lg p-4 hover:bg-slate-50 flex items-center gap-3 text-slate-800"><Search className="text-blue-600" /> View / search incoming letters</Link>
            <Link to="/outgoing" className="border rounded-lg p-4 hover:bg-slate-50 flex items-center gap-3 text-slate-800"><Search className="text-emerald-600" /> View / search outgoing letters</Link>
            <Link to="/reports" className="border border-purple-200 bg-purple-50 rounded-lg p-4 hover:bg-purple-100 flex items-center gap-3 text-purple-900 font-semibold"><Download className="text-purple-700" /> Download letter reports</Link>
            <Link to="/profile" className="border rounded-lg p-4 hover:bg-slate-50 flex items-center gap-3 text-slate-800"><UserCircle className="text-purple-600" /> Manage my profile</Link>
            {isAdmin && <Link to="/admin/users" className="border border-blue-200 bg-blue-50 rounded-lg p-4 hover:bg-blue-100 flex items-center gap-3 text-blue-900 font-semibold"><Shield className="text-blue-700" /> User management</Link>}
            {isAdmin && <Link to="/admin/gmail" className="border border-red-200 bg-red-50 rounded-lg p-4 hover:bg-red-100 flex items-center gap-3 text-red-900 font-semibold"><Mail className="text-red-700" /> Gmail inbox / Incoming Dak</Link>}
          </div>
        </div>
      </main>
    </div>
  );
}
