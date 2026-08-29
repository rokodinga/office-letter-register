import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, doc, getDocs, limit, query, setDoc, orderBy } from 'firebase/firestore';
import { ArrowLeft, CheckCircle2, Inbox, Loader2, Mail, RefreshCw, Search, ShieldAlert, ExternalLink } from 'lucide-react';
import { db } from '../firebase/config';
import { useAuth } from '../firebase/auth-context';

declare global {
  interface Window {
    google?: any;
  }
}

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
};

function loadGsi() {
  return new Promise<void>((resolve, reject) => {
    const id = 'google-identity-services';
    const existing = document.getElementById(id);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load Google sign-in services.'));
    document.head.appendChild(script);
  });
}

async function getAccessToken(clientId: string) {
  await loadGsi();
  if (!window.google?.accounts?.oauth2) throw new Error('Google authorization services are unavailable.');

  return await new Promise<string>((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
      callback: (response: any) => {
        if (response?.error) {
          reject(new Error(response.error_description || 'Gmail authorization was cancelled.'));
          return;
        }
        resolve(response.access_token);
      },
    });
    client.requestAccessToken({ prompt: '' });
  });
}

function header(headers: any[], name: string) {
  return headers.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value || '';
}

function gmailUrl(id: string) {
  return `https://mail.google.com/mail/u/0/#inbox/${id}`;
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
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    (async () => {
      try {
        const snapshot = await getDocs(query(collection(db, 'gmailInbox'), orderBy('receivedAt', 'desc'), limit(200)));
        if (active) setItems(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as GmailItem)));
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load Gmail inbox.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [isAdmin]);

  const syncGmail = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) {
      setError('Gmail sync is not configured. Add VITE_GOOGLE_CLIENT_ID in Vercel Environment Variables.');
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');

    try {
      const token = await getAccessToken(clientId);
      const collected: GmailItem[] = [];
      let pageToken = '';

      do {
        const params = new URLSearchParams({
          maxResults: '100',
          labelIds: 'INBOX',
          includeSpamTrash: 'false',
        });
        if (pageToken) params.set('pageToken', pageToken);

        const listResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!listResponse.ok) throw new Error(`Gmail message list failed (${listResponse.status}).`);
        const list = await listResponse.json();

        for (const message of list.messages || []) {
          const detailResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!detailResponse.ok) continue;

          const detail = await detailResponse.json();
          const headers = detail.payload?.headers || [];
          const item: GmailItem = {
            id: detail.id,
            threadId: detail.threadId,
            subject: header(headers, 'Subject') || '(No subject)',
            from: header(headers, 'From'),
            to: header(headers, 'To'),
            date: header(headers, 'Date'),
            snippet: detail.snippet || '',
            url: gmailUrl(detail.id),
          };
          collected.push(item);

          await setDoc(doc(db, 'gmailInbox', detail.id), {
            ...item,
            source: 'gmail',
            receivedAt: detail.internalDate ? Number(detail.internalDate) : Date.now(),
            syncedAt: new Date().toISOString(),
            syncedBy: userProfile?.uid || '',
          }, { merge: true });
        }

        pageToken = list.nextPageToken || '';
      } while (pageToken);

      const snapshot = await getDocs(query(collection(db, 'gmailInbox'), orderBy('receivedAt', 'desc'), limit(200)));
      setItems(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as GmailItem)));
      setLastSync(new Date().toLocaleString());
      setMessage(`Gmail sync complete. ${collected.length} inbox messages processed.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sync Gmail.');
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => [item.subject, item.from, item.to, item.date, item.snippet].join(' ').toLowerCase().includes(q));
  }, [items, search]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-100">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="bg-white rounded-2xl border shadow-sm p-8 text-center">
            <ShieldAlert className="mx-auto text-red-600" size={42} />
            <h1 className="text-2xl font-bold text-slate-900 mt-4">Administrator permission required</h1>
            <Link to="/dashboard" className="inline-flex items-center gap-2 mt-6 text-blue-700 font-semibold"><ArrowLeft size={18} /> Back to dashboard</Link>
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
          <Link to="/dashboard" className="text-blue-700 font-semibold inline-flex items-center gap-2"><ArrowLeft size={18} /> Dashboard</Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-700"><Inbox size={18} /> Administrator</div>
            <h1 className="text-3xl font-bold text-slate-900 mt-1">Gmail Inbox</h1>
            <p className="text-slate-600 mt-1">Review official incoming emails before registering them as Incoming Dak.</p>
          </div>
          <button onClick={() => void syncGmail()} disabled={busy} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-3 rounded-lg font-semibold">
            {busy ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            {busy ? 'Syncing Gmail...' : 'Sync Gmail Inbox'}
          </button>
        </div>

        {(error || message) && (
          <div className={error ? 'mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700' : 'mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'}>
            {error || message}
          </div>
        )}

        <div className="bg-white rounded-xl border shadow-sm p-4 mb-5 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[280px]">
            <Search size={18} className="absolute left-3 top-3 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sender, subject, date..." className="w-full border rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="text-sm text-slate-500">{items.length} synced inbox messages{lastSync ? ` • Last sync ${lastSync}` : ''}</div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500"><Loader2 className="animate-spin mx-auto mb-3" />Loading synced mail...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Mail className="mx-auto mb-3 text-slate-400" size={36} />
              No synced inbox messages. Click “Sync Gmail Inbox” to fetch them.
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((item) => (
                <div key={item.id} className="p-5 flex flex-wrap gap-4 justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2 className="font-bold text-slate-900">{item.subject}</h2>
                      {item.registered ? <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-1 text-xs font-semibold"><CheckCircle2 size={13} /> Registered</span> : <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-1 text-xs font-semibold">Pending Review</span>}
                    </div>
                    <div className="text-sm text-slate-600">{item.from} {item.to ? `→ ${item.to}` : ''}</div>
                    <div className="text-xs text-slate-500 mt-1">{item.date}</div>
                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">{item.snippet}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ExternalLink size={16} /> Open Gmail</a>
                    {!item.registered && (
                      <button onClick={() => navigate(`/incoming?gmailId=${encodeURIComponent(item.id)}`)} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-sm font-semibold">
                        Register as Incoming Dak
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <strong>How this works:</strong> Gmail metadata is synced into a review queue. Nothing is automatically registered as official Incoming Dak until an administrator approves it. Email bodies are not copied into Firestore.
        </div>
      </main>
    </div>
  );
}
