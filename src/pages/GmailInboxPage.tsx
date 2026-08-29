import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs, limit, query, orderBy } from 'firebase/firestore';
import { ArrowLeft, CheckCircle2, Inbox, Loader2, Mail, RefreshCw, Search, ShieldAlert, ExternalLink, Unplug } from 'lucide-react';
import { db, auth } from '../firebase/config';
import { getIdToken } from 'firebase/auth';
import { useAuth } from '../firebase/auth-context';

type GmailItem = {
  id: string;
  threadId?: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  url: string;
  registered?: boolean;
  registeredLetterId?: string;
  reviewStatus?: 'pending' | 'registered';
};

type GmailStatus = {
  connected: boolean;
  email?: string | null;
  connectedAt?: string | null;
  lastSyncAt?: string | null;
};

async function apiRequest(mode: string, method = 'GET') {
  const token = await getIdToken(auth.currentUser!, true);
  const response = await fetch(`/api/admin/gmail?mode=${encodeURIComponent(mode)}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Gmail request failed.');
  return data;
}

export function GmailInboxPage() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = userProfile?.role === 'Administrator';

  const [items, setItems] = useState<GmailItem[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<GmailStatus>({ connected: false });

  const reloadInbox = async () => {
    const snapshot = await getDocs(
      query(collection(db, 'gmailInbox'), orderBy('receivedAt', 'desc'), limit(200)),
    );
    setItems(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as GmailItem)));
  };

  const loadStatus = async () => {
    const data = await apiRequest('status');
    setStatus(data);
  };

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    let active = true;
    (async () => {
      try {
        await Promise.all([reloadInbox(), loadStatus()]);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load Gmail status.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [isAdmin]);

  const connectGmail = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const data = await apiRequest('auth');
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect Gmail.');
      setBusy(false);
    }
  };

  const syncGmail = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const data = await apiRequest('sync', 'POST');
      await Promise.all([reloadInbox(), loadStatus()]);
      setMessage(
        `Gmail sync complete. ${data.processed || 0} inbox messages checked and ${data.createdPending || 0} messages added to the review queue.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sync Gmail.');
    } finally {
      setBusy(false);
    }
  };

  const disconnectGmail = async () => {
    if (!window.confirm('Disconnect Gmail from Office Letter Register? Existing Incoming Dak records will not be deleted.')) return;

    setBusy(true);
    setError('');
    setMessage('');
    try {
      await apiRequest('disconnect', 'POST');
      setStatus({ connected: false });
      setMessage('Gmail disconnected. Existing Incoming Dak records remain unchanged.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to disconnect Gmail.');
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.subject, item.from, item.to, item.date, item.snippet]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [items, search]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-100">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="bg-white rounded-2xl border shadow-sm p-8 text-center">
            <ShieldAlert className="mx-auto text-red-600" size={42} />
            <h1 className="text-2xl font-bold text-slate-900 mt-4">Administrator permission required</h1>
            <Link to="/dashboard" className="inline-flex items-center gap-2 mt-6 text-blue-700 font-semibold">
              <ArrowLeft size={18} /> Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/dashboard" className="text-2xl font-bold text-blue-900">Office Letter Register</Link>
          <Link to="/dashboard" className="text-blue-700 font-semibold inline-flex items-center gap-2">
            <ArrowLeft size={18} /> Dashboard
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
              <Inbox size={18} /> Administrator
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mt-1">Gmail Inbox</h1>
            <p className="text-slate-600 mt-1">
              Gmail Inbox messages are synchronized automatically into a review queue. Nothing becomes an official Incoming Dak record until you approve and register it.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {status.connected && (
              <button
                onClick={() => void disconnectGmail()}
                disabled={busy}
                className="inline-flex items-center gap-2 border border-red-200 bg-white hover:bg-red-50 disabled:opacity-60 text-red-700 px-4 py-3 rounded-lg font-semibold"
              >
                <Unplug size={18} /> Disconnect
              </button>
            )}
            <button
              onClick={() => void connectGmail()}
              disabled={busy}
              className="inline-flex items-center gap-2 border border-blue-200 bg-white hover:bg-blue-50 disabled:opacity-60 text-blue-800 px-4 py-3 rounded-lg font-semibold"
            >
              <Mail size={18} /> {status.connected ? 'Reconnect Gmail' : 'Connect Gmail'}
            </button>
            <button
              onClick={() => void syncGmail()}
              disabled={busy || !status.connected}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-3 rounded-lg font-semibold"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              {busy ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>

        <div className="mb-5 rounded-xl border bg-white p-4 shadow-sm">
          {status.connected ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 font-semibold text-green-700">
                  <CheckCircle2 size={18} /> Gmail connected
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  {status.email || 'Connected Google account'}
                  {status.lastSyncAt ? ` • Last sync ${new Date(status.lastSyncAt).toLocaleString()}` : ' • Not synchronized yet'}
                </div>
              </div>
              <div className="text-sm text-slate-500">
                Vercel can sync the inbox on the configured schedule. Registration always requires your explicit approval.
              </div>
            </div>
          ) : (
            <div className="text-sm text-amber-800">
              <strong>Gmail is not connected.</strong> Connect the official Gmail account to start automatic Incoming Dak synchronization.
            </div>
          )}
        </div>

        {(error || message) && (
          <div className={error
            ? 'mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'
            : 'mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'}
          >
            {error || message}
          </div>
        )}

        <div className="bg-white rounded-xl border shadow-sm p-4 mb-5 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[280px]">
            <Search size={18} className="absolute left-3 top-3 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sender, subject, date..."
              className="w-full border rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-sm text-slate-500">{items.length} synced inbox messages</div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <Loader2 className="animate-spin mx-auto mb-3" />Loading Gmail inbox...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Mail className="mx-auto mb-3 text-slate-400" size={36} />
              {status.connected ? 'No synchronized inbox messages yet. Click “Sync Now”.' : 'Connect Gmail to begin synchronization.'}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((item) => (
                <div key={item.id} className="p-5 flex flex-wrap gap-4 justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2 className="font-bold text-slate-900">{item.subject}</h2>
                      {item.registered ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-1 text-xs font-semibold">
                          <CheckCircle2 size={13} /> Registered Incoming Dak
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-1 text-xs font-semibold">
                          Pending Review
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-600">{item.from} {item.to ? `→ ${item.to}` : ''}</div>
                    <div className="text-xs text-slate-500 mt-1">{item.date}</div>
                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">{item.snippet}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <ExternalLink size={16} /> Open Gmail
                    </a>

                    {item.registeredLetterId ? (
                      <button
                        onClick={() => navigate('/incoming')}
                        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-2 text-sm font-semibold"
                      >
                        View Incoming Dak
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/incoming?gmailId=${encodeURIComponent(item.id)}`)}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-sm font-semibold"
                      >
                        Review & Register
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <strong>Workflow:</strong> Gmail sync imports new inbox messages into this review queue only.
          Open <strong>Review & Register</strong> to check and edit the office fields, attach supporting files from Google Drive,
          and explicitly register the message as Incoming Dak. The original email remains in Gmail.
        </div>
      </main>
    </div>
  );
}
