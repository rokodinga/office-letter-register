import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { ArrowDownToLine, ArrowUpFromLine, FileText, LogOut, Mail, MapPinned, Plus, Search, Shield, UserCircle, Download } from 'lucide-react';
import { db } from '../firebase/config';
import { useAuth } from '../firebase/auth-context';

function resolveProfilePhotoUrl(value?: string | null): string {
  const raw = value?.trim() || '';
  if (!raw) return '';
  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase();
    if (hostname === 'drive.google.com' || hostname === 'www.drive.google.com') {
      const pathMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
      const id = pathMatch?.[1] || url.searchParams.get('id');
      if (id) return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w400`;
    }
    return raw;
  } catch { return ''; }
}

export function DashboardPage() {
  const { user, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [incomingCount, setIncomingCount] = useState(0);
  const [outgoingCount, setOutgoingCount] = useState(0);

  useEffect(() => {
    const unsubIncoming = onSnapshot(collection(db, 'incomingLetters'), snapshot => setIncomingCount(snapshot.size));
    const unsubOutgoing = onSnapshot(collection(db, 'outgoingLetters'), snapshot => setOutgoingCount(snapshot.size));
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
      <nav className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-4" aria-label="Office Letter Register dashboard">
            <img src="https://upload.wikimedia.org/wikipedia/commons/f/fe/Seal_of_Odisha.png" alt="Government of Odisha emblem" className="h-14 w-14 shrink-0 object-contain" />
            <span className="min-w-0"><span className="block text-lg font-bold leading-tight text-blue-900 md:text-2xl">Forest, Environment &amp; Climate Change Department Govt of Odisha</span><span className="mt-1 block text-sm font-semibold leading-tight text-slate-700 md:text-base">Forest Range Office, Kodinga</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/range-information" className="hidden items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100 sm:flex"><MapPinned size={17}/> Range Information</Link>
            <Link to="/profile" className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100" title="View profile">
              {profilePhoto ? <img src={profilePhoto} alt="Profile" className="h-9 w-9 rounded-full border-2 border-blue-100 object-cover" onError={event => { event.currentTarget.style.display='none'; const fallback=event.currentTarget.nextElementSibling as HTMLElement|null; if(fallback) fallback.style.display='flex'; }} /> : null}
              <span className="h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800" style={{display:profilePhoto?'none':'flex'}} aria-hidden="true">{initials}</span>
              <span className="hidden text-left md:block"><span className="block text-sm font-semibold text-slate-900">{displayName}</span><span className="block text-xs text-slate-500">View profile</span></span>
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"><LogOut size={18}/> Sign Out</button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold text-slate-900">Welcome, {displayName}</h1><p className="mt-1 text-slate-600">{isAdmin?'Register, search and manage incoming and outgoing correspondence.':'View and search incoming and outgoing correspondence.'}</p></div>{isAdmin&&<div className="flex gap-3"><Link to="/incoming" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"><Plus size={18}/> Incoming Letter</Link><Link to="/outgoing" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"><Plus size={18}/> Outgoing Letter</Link></div>}</div>
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Link to="/incoming" className="rounded-xl bg-blue-600 p-6 text-white shadow transition hover:bg-blue-700"><div className="flex justify-between"><ArrowDownToLine size={28}/><span className="text-4xl font-bold">{incomingCount}</span></div><h2 className="mt-5 text-xl font-bold">Incoming Letters</h2><p className="mt-1 text-blue-100">{isAdmin?'View and register received correspondence':'View received correspondence'}</p></Link>
          <Link to="/outgoing" className="rounded-xl bg-emerald-600 p-6 text-white shadow transition hover:bg-emerald-700"><div className="flex justify-between"><ArrowUpFromLine size={28}/><span className="text-4xl font-bold">{outgoingCount}</span></div><h2 className="mt-5 text-xl font-bold">Outgoing Letters</h2><p className="mt-1 text-emerald-100">{isAdmin?'View and register dispatched correspondence':'View dispatched correspondence'}</p></Link>
          <div className="rounded-xl bg-purple-600 p-6 text-white shadow"><div className="flex justify-between"><FileText size={28}/><span className="text-4xl font-bold">{total}</span></div><h2 className="mt-5 text-xl font-bold">Total Records</h2><p className="mt-1 text-purple-100">All letters currently registered</p></div>
        </div>

        <div className="mb-6 overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-950 p-6 text-white shadow-lg"><div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-200"><MapPinned size={14}/> Public information</div><h2 className="text-2xl font-black">Kodinga Range Information Centre</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100/80">Explore Sections, Beats, forests, plantations, nurseries, villages, VSS, fire points and other Range information. Viewing is public; registered users can download and print.</p></div><Link to="/range-information" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-emerald-950 hover:bg-emerald-50">Open Range Centre <MapPinned size={17}/></Link></div></div>

        <div className="rounded-xl border bg-white p-6 shadow-sm"><h2 className="mb-4 text-xl font-bold text-slate-900">Quick actions</h2><div className="grid gap-4 md:grid-cols-3"><Link to="/incoming" className="flex items-center gap-3 rounded-lg border p-4 text-slate-800 hover:bg-slate-50"><Search className="text-blue-600"/> View / search incoming letters</Link><Link to="/outgoing" className="flex items-center gap-3 rounded-lg border p-4 text-slate-800 hover:bg-slate-50"><Search className="text-emerald-600"/> View / search outgoing letters</Link><Link to="/range-information" className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-900 hover:bg-emerald-100"><MapPinned className="text-emerald-700"/> Range Information Centre</Link><Link to="/reports" className="flex items-center gap-3 rounded-lg border border-purple-200 bg-purple-50 p-4 font-semibold text-purple-900 hover:bg-purple-100"><Download className="text-purple-700"/> Download letter reports</Link><Link to="/profile" className="flex items-center gap-3 rounded-lg border p-4 text-slate-800 hover:bg-slate-50"><UserCircle className="text-purple-600"/> Manage my profile</Link>{isAdmin&&<Link to="/admin/users" className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 font-semibold text-blue-900 hover:bg-blue-100"><Shield className="text-blue-700"/> User management</Link>}{isAdmin&&<Link to="/admin/gmail" className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 font-semibold text-red-900 hover:bg-red-100"><Mail className="text-red-700"/> Gmail inbox / Incoming Dak</Link>}</div></div>
      </main>
    </div>
  );
}
