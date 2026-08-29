import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { ArrowDownToLine, ArrowUpFromLine, FileText, LogOut, Plus, Search } from 'lucide-react';
import { db } from '../firebase/config';
import { useAuth } from '../firebase/auth-context';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [incomingCount, setIncomingCount] = useState(0);
  const [outgoingCount, setOutgoingCount] = useState(0);

  useEffect(() => {
    const unsubIncoming = onSnapshot(collection(db, 'incomingLetters'), (snapshot) => {
      setIncomingCount(snapshot.size);
    });
    const unsubOutgoing = onSnapshot(collection(db, 'outgoingLetters'), (snapshot) => {
      setOutgoingCount(snapshot.size);
    });

    return () => {
      unsubIncoming();
      unsubOutgoing();
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const total = incomingCount + outgoingCount;

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap gap-4 justify-between items-center">
          <Link to="/dashboard" className="text-2xl font-bold text-blue-900">Office Letter Register</Link>
          <div className="flex items-center gap-4">
            <span className="text-gray-600 hidden md:inline">Welcome, <strong>{user?.email}</strong></span>
            <button onClick={handleLogout} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg">
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Office Letter Register</h1>
            <p className="text-slate-600 mt-1">Register, search and manage incoming and outgoing correspondence.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/incoming" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold">
              <Plus size={18} /> Incoming Letter
            </Link>
            <Link to="/outgoing" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold">
              <Plus size={18} /> Outgoing Letter
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link to="/incoming" className="bg-blue-600 hover:bg-blue-700 rounded-xl shadow p-6 text-white transition">
            <div className="flex justify-between"><ArrowDownToLine size={28} /><span className="text-4xl font-bold">{incomingCount}</span></div>
            <h2 className="text-xl font-bold mt-5">Incoming Letters</h2>
            <p className="text-blue-100 mt-1">View and register received correspondence</p>
          </Link>
          <Link to="/outgoing" className="bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow p-6 text-white transition">
            <div className="flex justify-between"><ArrowUpFromLine size={28} /><span className="text-4xl font-bold">{outgoingCount}</span></div>
            <h2 className="text-xl font-bold mt-5">Outgoing Letters</h2>
            <p className="text-emerald-100 mt-1">View and register dispatched correspondence</p>
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
            <Link to="/incoming" className="border rounded-lg p-4 hover:bg-slate-50 flex items-center gap-3">
              <Search className="text-blue-600" /> Search incoming letters
            </Link>
            <Link to="/outgoing" className="border rounded-lg p-4 hover:bg-slate-50 flex items-center gap-3">
              <Search className="text-emerald-600" /> Search outgoing letters
            </Link>
            <Link to="/outgoing" className="border rounded-lg p-4 hover:bg-slate-50 flex items-center gap-3">
              <Plus className="text-purple-600" /> Register a new letter
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
