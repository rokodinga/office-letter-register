import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { ArrowLeft, CalendarDays, CheckCircle2, ChevronRight, Clock3, ExternalLink, History, Inbox, Loader2, Mail, RefreshCw, Search, ShieldAlert, Unplug } from 'lucide-react';
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
  registeredLetterId?: string | null;
  reviewStatus?: 'pending' | 'registered';
};

type GmailStatus = {
  connected: boolean;
  email?: string | null;
  connectedAt?: string | null;
  lastSyncAt?: string | null;
  lastError?: string | null;
  reauthorizationRequired?: boolean;
};

type GmailMode = 'pending' | 'history';

async function apiRequest(
  mode: string,
  method = 'GET',
  params: Record<string, string> = {},
) {
  const token = await getIdToken(auth.currentUser!, true);
  const searchParams = new URLSearchParams({ mode, ...params });
  const response = await fetch(`/api/admin/gmail?${searchParams.toString()}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });

  const raw = await response.text();
  let data: Record<string, any> = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    const contentType = response.headers.get('content-type') || '';
    const preview = raw.replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim().slice(0, 240);
    throw new Error(
      response.ok
        ? 'Gmail API returned an invalid response.'
        : `Gmail API returned a non-JSON response (${response.status}, ${contentType || 'unknown content type'}).${preview ? ` Server response: ${preview}` : ''}`,
    );
  }

  if (!response.ok) throw new Error(data.error || 'Gmail request failed.');
  return data;
}

const pad = (value: number) => String(value).padStart(2, '0');
const toDateInput = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function monthRange(year: number, month: number) {
  return {
    from: `${year}-${pad(month + 1)}-01`,
    to: toDateInput(new Date(year, month + 1, 0)),
  };
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function GmailInboxPage() {
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.role === 'Administrator';

  const [items, setItems] = useState<GmailItem[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<GmailStatus>({ connected: false });
  const [activeMode, setActiveMode] = useState<GmailMode>('pending');

  const now = new Date();
  const [historyYear, setHistoryYear] = useState(now.getFullYear());
  const [historyFrom, setHistoryFrom] = useState(monthRange(now.getFullYear(), now.getMonth()).from);
  const [historyTo, setHistoryTo] = useState(monthRange(now.getFullYear(), now.getMonth()).to);
  const [historySearch, setHistorySearch] = useState('');
  const [historyItems, setHistoryItems] = useState<GmailItem[]>([]);
  const [historyNextPage, setHistoryNextPage] = useState('');
  const [historyCurrentPageToken, setHistoryCurrentPageToken] = useState('');
  const [historyEstimate, setHistoryEstimate] = useState(0);

  const reloadInbox = async () => {
    const snapshot = await getDocs(
      query(collection(db, 'gmailInbox'), orderBy('receivedAt', 'desc'), limit(200)),
    );
    setItems(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as GmailItem)));
  };

  const loadStatus = async () => {
    const data = await apiRequest('status');
    setStatus(data as GmailStatus);
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
      if (data.errors?.length) {
        throw new Error(data.errors.map((item: { error: string }) => item.error).join(' | '));
      }
      setMessage(
        `Gmail sync complete. ${data.processed || 0} official messages checked, ${data.skippedFiltered || 0} non-matching messages filtered out, and ${data.createdPending || 0} new messages added to the review queue.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sync Gmail.');
    } finally {
      setBusy(false);
    }
  };

  const cleanupLegacyGmail = async () => {
    if (!window.confirm('Clear all unregistered Gmail review-queue entries created so far? This will not delete anything from Gmail and will not delete Incoming Dak records that you already registered.')) return;

    setBusy(true);
    setError('');
    setMessage('');
    try {
      const data = await apiRequest('cleanup-legacy', 'POST');
      await reloadInbox();
      setMessage(
        'Gmail review queue cleared. Deleted ' +
        (data.deletedGmailInbox || 0) +
        ' unregistered Gmail queue entries. Gmail messages themselves were not deleted.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to clear the Gmail review queue.');
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

  const searchHistory = async (append = false) => {
    if (!status.connected) {
      setError('Connect Gmail before searching historical mail.');
      return;
    }

    if (!historyFrom || !historyTo || historyFrom > historyTo) {
      setError('Please select a valid historical date range.');
      return;
    }

    setHistoryBusy(true);
    setError('');
    setMessage('');
    try {
      const currentPageToken = append && historyNextPage ? historyNextPage : '';
      const data = await apiRequest('history', 'GET', {
        from: historyFrom,
        to: historyTo,
        search: historySearch,
        ...(currentPageToken ? { pageToken: currentPageToken } : {}),
      });

      setHistoryCurrentPageToken(currentPageToken);
      setHistoryItems((current) => append ? [...current, ...(data.items || [])] : (data.items || []));
      setHistoryNextPage(data.nextPageToken || '');
      setHistoryEstimate(Number(data.resultSizeEstimate || data.items?.length || 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to search historical Gmail.');
    } finally {
      setHistoryBusy(false);
    }
  };

  const importHistoryPage = async () => {
    if (!status.connected || !historyItems.length) return;

    setHistoryBusy(true);
    setError('');
    setMessage('');
    try {
      const data = await apiRequest('history-sync', 'GET', {
        from: historyFrom,
        to: historyTo,
        search: historySearch,
        ...(historyCurrentPageToken ? { pageToken: historyCurrentPageToken } : {}),
      });
      await reloadInbox();
      setMessage(
        `Imported ${data.imported || 0} new message(s) from this historical result page into the Pending Review queue. Already registered messages were left unchanged.`,
      );
      setHistoryItems((current) =>
        current.map((item) => ({
          ...item,
          registered: item.registered || false,
          reviewStatus: item.registered ? 'registered' : 'pending',
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to import historical Gmail.');
    } finally {
      setHistoryBusy(false);
    }
  };

  const selectMonth = (month: number) => {
    const range = monthRange(historyYear, month);
    setHistoryFrom(range.from);
    setHistoryTo(range.to);
    setHistoryItems([]);
    setHistoryNextPage('');
    setHistoryEstimate(0);
  };

  const pendingItems = useMemo(
    () => items.filter((item) => !item.registered && !item.registeredLetterId),
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pendingItems;
    return pendingItems.filter((item) =>
      [item.subject, item.from, item.to, item.date, item.snippet]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [pendingItems, search]);

  const years = Array.from({ length: Math.max(1, now.getFullYear() - 2014) }, (_, index) => now.getFullYear() - index);

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
            <p className="text-slate-600 mt-1 max-w-3xl">
              Review new official correspondence here. Older correspondence can be searched directly from Gmail by month, year, or custom date range without flooding the review queue.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => void cleanupLegacyGmail()} disabled={busy}
              className="inline-flex items-center gap-2 border border-amber-200 bg-white hover:bg-amber-50 disabled:opacity-60 text-amber-800 px-4 py-3 rounded-lg font-semibold">
              Clear Pending Queue
            </button>
            {status.connected && (
              <button onClick={() => void disconnectGmail()} disabled={busy}
                className="inline-flex items-center gap-2 border border-red-200 bg-white hover:bg-red-50 disabled:opacity-60 text-red-700 px-4 py-3 rounded-lg font-semibold">
                <Unplug size={18} /> Disconnect
              </button>
            )}
            <button onClick={() => void connectGmail()} disabled={busy}
              className="inline-flex items-center gap-2 border border-blue-200 bg-white hover:bg-blue-50 disabled:opacity-60 text-blue-800 px-4 py-3 rounded-lg font-semibold">
              <Mail size={18} /> {status.connected ? 'Reconnect Gmail' : 'Connect Gmail'}
            </button>
            <button onClick={() => void syncGmail()} disabled={busy || !status.connected}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-3 rounded-lg font-semibold">
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
                  {status.lastSyncAt ? ` • Last sync ${new Date(status.lastSyncAt).toLocaleString()}` : ' • Automatic sync has not run yet'}
                  {status.lastError ? ` • Last error: ${status.lastError}` : ''}
                </div>
              </div>
              <div className="text-sm text-slate-500 max-w-xl">
                Automatic sync is restricted to the configured official sender/domain allowlist and Primary inbox. Historical search uses the same official-mail policy.
              </div>
            </div>
          ) : (
            <div className="text-sm">
              {status.lastError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                  <strong>Gmail authorization needs attention.</strong> {status.lastError}
                  <div className="mt-2">
                    <button onClick={() => void connectGmail()} disabled={busy}
                      className="font-semibold text-blue-700 hover:text-blue-900 underline">
                      Reconnect Gmail
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-amber-800">
                  <strong>Gmail is not connected.</strong> Connect the official Gmail account to search and synchronize correspondence.
                </div>
              )}
            </div>
          )}
        </div>

        {(error || message) && (
          <div className={error
            ? 'mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'
            : 'mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'}>
            {error || message}
          </div>
        )}

        <div className="bg-white rounded-xl border shadow-sm p-1 mb-5 flex gap-1">
          <button onClick={() => setActiveMode('pending')}
            className={activeMode === 'pending'
              ? 'flex-1 rounded-lg bg-blue-600 text-white px-4 py-3 font-semibold'
              : 'flex-1 rounded-lg px-4 py-3 font-semibold text-slate-600 hover:bg-slate-50'}>
            <span className="inline-flex items-center gap-2"><Clock3 size={18} /> Pending Review <span className="rounded-full bg-white/20 px-2">{pendingItems.length}</span></span>
          </button>
          <button onClick={() => setActiveMode('history')}
            className={activeMode === 'history'
              ? 'flex-1 rounded-lg bg-blue-600 text-white px-4 py-3 font-semibold'
              : 'flex-1 rounded-lg px-4 py-3 font-semibold text-slate-600 hover:bg-slate-50'}>
            <span className="inline-flex items-center gap-2"><History size={18} /> Gmail History</span>
          </button>
        </div>

        {activeMode === 'pending' ? (
          <>
            <div className="bg-white rounded-xl border shadow-sm p-4 mb-5 flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[280px]">
                <Search size={18} className="absolute left-3 top-3 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search pending sender, subject, date..."
                  className="w-full border rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">{pendingItems.length} Pending</span>
                <span className="text-slate-500">awaiting review</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-slate-500"><Loader2 className="animate-spin mx-auto mb-3" />Loading Gmail inbox...</div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Mail className="mx-auto mb-3 text-slate-400" size={36} />
                  {status.connected
                    ? 'No pending Gmail correspondence. New approved emails will appear here after the next sync.'
                    : 'Connect Gmail to begin synchronization.'}
                </div>
              ) : (
                <div className="divide-y">
                  {filtered.map((item) => (
                    <div key={item.id} className="p-5 flex flex-wrap gap-4 justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h2 className="font-bold text-slate-900">{item.subject}</h2>
                          <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-1 text-xs font-semibold">Pending Review</span>
                        </div>
                        <div className="text-sm text-slate-600">{item.from} {item.to ? `→ ${item.to}` : ''}</div>
                        <div className="text-xs text-slate-500 mt-1">{item.date}</div>
                        <p className="text-sm text-slate-500 mt-2 line-clamp-2">{item.snippet}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={item.url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                          <ExternalLink size={16} /> Open Gmail
                        </a>
                        <button onClick={() => { window.location.href = `/incoming?gmailId=${encodeURIComponent(item.id)}`; }}
                          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-sm font-semibold">
                          Review & Register
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              <strong>Review queue:</strong> only correspondence that has not been registered as Incoming Dak is shown here. Registered correspondence stays in the Incoming Dak register and remains in Gmail for traceability.
            </div>
          </>
        ) : (
          <section className="space-y-5">
            <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
              <div className="border-b bg-gradient-to-r from-blue-50 to-white px-6 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-blue-700 font-semibold">
                      <CalendarDays size={19} /> Historical Gmail
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mt-1">Find older correspondence</h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Search Gmail directly without importing years of mail into the review queue.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-slate-600">Year</label>
                    <select value={historyYear} onChange={(e) => {
                      const year = Number(e.target.value);
                      setHistoryYear(year);
                      const range = monthRange(year, Math.min(now.getMonth(), 11));
                      setHistoryFrom(range.from);
                      setHistoryTo(range.to);
                      setHistoryItems([]);
                      setHistoryNextPage('');
                    }} className="border rounded-lg px-3 py-2 bg-white">
                      {years.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-5">
                  {monthNames.map((name, index) => {
                    const future = historyYear === now.getFullYear() && index > now.getMonth();
                    const selected = historyFrom === monthRange(historyYear, index).from && historyTo === monthRange(historyYear, index).to;
                    return (
                      <button key={name} disabled={future} onClick={() => selectMonth(index)}
                        className={selected
                          ? 'rounded-lg border border-blue-600 bg-blue-600 text-white px-3 py-2 text-sm font-semibold'
                          : 'rounded-lg border bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 text-sm font-semibold text-slate-700'}>
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <label className="text-sm font-semibold text-slate-700">
                    From
                    <input type="date" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)}
                      className="mt-1 w-full border rounded-lg px-3 py-2.5 font-normal" />
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    To
                    <input type="date" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)}
                      className="mt-1 w-full border rounded-lg px-3 py-2.5 font-normal" />
                  </label>
                </div>

                <div className="relative mt-4">
                  <Search size={18} className="absolute left-3 top-3 text-slate-400" />
                  <input value={historySearch} onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Optional: search words, sender, subject..."
                    className="w-full border rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <button onClick={() => void searchHistory(false)} disabled={historyBusy || !status.connected}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-2.5 rounded-lg font-semibold">
                    {historyBusy ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                    {historyBusy ? 'Searching Gmail...' : 'Search Gmail'}
                  </button>
                  {historyItems.length > 0 && (
                    <button onClick={() => void importHistoryPage()} disabled={historyBusy}
                      className="inline-flex items-center gap-2 border border-green-200 bg-green-50 hover:bg-green-100 disabled:opacity-60 text-green-800 px-4 py-2.5 rounded-lg font-semibold">
                      <Inbox size={18} /> Import this page to Review Queue
                    </button>
                  )}
                  <span className="text-sm text-slate-500">
                    {historyEstimate ? `Gmail reports about ${historyEstimate} matching message(s)` : 'Choose a period and search'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b flex flex-wrap justify-between items-center gap-3">
                <div>
                  <h2 className="font-bold text-slate-900">Historical results</h2>
                  <p className="text-xs text-slate-500">{historyFrom} to {historyTo}</p>
                </div>
                {historyNextPage && (
                  <button onClick={() => void searchHistory(true)} disabled={historyBusy}
                    className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Load next 100 <ChevronRight size={16} />
                  </button>
                )}
              </div>

              {historyItems.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <History className="mx-auto mb-3 text-slate-400" size={38} />
                  Select a month or custom date range and click <strong>Search Gmail</strong>.
                </div>
              ) : (
                <div className="divide-y">
                  {historyItems.map((item) => (
                    <div key={item.id} className="p-5 flex flex-wrap gap-4 justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-900">{item.subject}</h3>
                          {item.registered ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-1 text-xs font-semibold">
                              <CheckCircle2 size={13} /> Registered Incoming Dak
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-1 text-xs font-semibold">Not registered</span>
                          )}
                        </div>
                        <div className="text-sm text-slate-600">{item.from} {item.to ? `→ ${item.to}` : ''}</div>
                        <div className="text-xs text-slate-500 mt-1">{item.date}</div>
                        <p className="text-sm text-slate-500 mt-2 line-clamp-2">{item.snippet}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={item.url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                          <ExternalLink size={16} /> Open Gmail
                        </a>
                        {!item.registered && (
                          <button onClick={() => {
                            setActiveMode('pending');
                            window.location.href = `/incoming?gmailId=${encodeURIComponent(item.id)}`;
                          }}
                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-sm font-semibold">
                            Review & Register
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <strong>How this works:</strong> Historical Gmail is read directly from Gmail using the same official sender/domain policy as automatic sync. It is not copied into Firestore unless you explicitly choose <strong>Import this page to Review Queue</strong>. Registered messages are identified against the application's Incoming Dak registration records.
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
