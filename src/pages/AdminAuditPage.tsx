import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { Activity, ArrowLeft, Shield } from 'lucide-react';
import { db } from '../firebase/config';

interface AuditLog {
  id: string;
  actorUid: string;
  targetUid: string;
  action: string;
  details?: Record<string, unknown>;
  createdAt?: { toDate?: () => Date } | null;
}

export function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const auditQuery = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(200));
    return onSnapshot(auditQuery, (snapshot) => {
      setLogs(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<AuditLog, 'id'>) })));
    }, (err) => {
      console.error(err);
      setError('Unable to load audit history. Publish the Firestore rules and make sure you are an administrator.');
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/dashboard" className="text-2xl font-bold text-blue-900">Office Letter Register</Link>
          <Link to="/admin/users" className="flex items-center gap-2 text-blue-600 font-semibold"><ArrowLeft size={18} /> User Management</Link>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-2"><Shield className="text-blue-700" size={30} /><h1 className="text-3xl font-bold text-slate-900">Administrator Audit Log</h1></div>
        <p className="text-slate-600 mb-6">Recent administrator actions affecting user accounts.</p>
        {error && <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          {logs.length === 0 ? <div className="p-10 text-center text-slate-500">No administrator actions recorded yet.</div> : (
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50 border-b"><tr><th className="px-5 py-4 text-sm font-bold">Time</th><th className="px-5 py-4 text-sm font-bold">Action</th><th className="px-5 py-4 text-sm font-bold">Administrator UID</th><th className="px-5 py-4 text-sm font-bold">Target UID</th><th className="px-5 py-4 text-sm font-bold">Details</th></tr></thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 text-sm text-slate-600">{log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : 'Pending...'}</td>
                    <td className="px-5 py-4"><span className="inline-flex items-center gap-2 font-semibold text-blue-800"><Activity size={15} />{log.action}</span></td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">{log.actorUid}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">{log.targetUid}</td>
                    <td className="px-5 py-4 text-xs text-slate-600">{log.details ? JSON.stringify(log.details) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
