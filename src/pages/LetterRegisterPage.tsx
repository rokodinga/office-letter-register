import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getIdToken } from 'firebase/auth';
import {
  ArrowLeft,
  Download,
  Edit3,
  Paperclip,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { db, auth } from '../firebase/config';
import { useAuth } from '../firebase/auth-context';
import { AttachmentsSection, type LetterAttachment } from '../components/AttachmentsSection';

type LetterType = 'incoming' | 'outgoing';
type OutgoingSource = 'manual' | 'incoming' | 'gmailSent';

interface Letter {
  id: string;
  letterNo?: string;
  dispatchNo?: string;
  date?: string;
  dispatchDate?: string;
  receivedDate?: string;
  from?: string;
  to?: string;
  addressee?: string;
  subject?: string;
  fileNo?: string;
  reference?: string;
  remarks?: string;
  attachments?: LetterAttachment[];
  sourceType?: OutgoingSource;
  sourceIncomingLetterId?: string;
  sourceGmailMessageId?: string;
}

interface GmailSentItem {
  id: string;
  threadId?: string;
  subject: string;
  from?: string;
  to?: string;
  cc?: string;
  date: string;
  snippet: string;
  url: string;
  registered?: boolean;
  registeredLetterId?: string;
}

interface FormData {
  number: string;
  date: string;
  party: string;
  subject: string;
  fileNo: string;
  reference: string;
  remarks: string;
  attachments: LetterAttachment[];
  sourceType: OutgoingSource;
  sourceIncomingLetterId: string;
  sourceGmailMessageId: string;
}

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): FormData => ({
  number: '',
  date: today(),
  party: '',
  subject: '',
  fileNo: '',
  reference: '',
  remarks: '',
  attachments: [],
  sourceType: 'manual',
  sourceIncomingLetterId: '',
  sourceGmailMessageId: '',
});

function formatDate(value?: string) {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

function addRePrefix(subject: string) {
  const value = subject.trim();
  if (!value) return '';
  return /^(re|fw|fwd):/i.test(value) ? value : 'Re: ' + value;
}

async function loadSentGmail() {
  const token = await getIdToken(auth.currentUser!, true);
  const response = await fetch('/api/admin/gmail-sent?mode=list', {
    headers: { Authorization: 'Bearer ' + token },
  });
  const raw = await response.text();
  let data: Record<string, any> = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error('Gmail Sent API returned an invalid response.'); }
  if (!response.ok) throw new Error(data.error || 'Unable to load Gmail sent mail.');
  return Array.isArray(data.items) ? data.items as GmailSentItem[] : [];
}

async function syncSentGmail() {
  const token = await getIdToken(auth.currentUser!, true);
  const response = await fetch('/api/admin/gmail-sent?mode=sync', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
  });
  const raw = await response.text();
  let data: Record<string, any> = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error('Gmail Sent API returned an invalid response.'); }
  if (!response.ok) throw new Error(data.error || 'Unable to sync Gmail sent mail.');
  if (data.errors?.length) {
    throw new Error(data.errors.map((item: { error: string }) => item.error).join(' | '));
  }
  return data;
}

async function cleanupSentGmail() {
  const token = await getIdToken(auth.currentUser!, true);
  const response = await fetch('/api/admin/gmail-sent?mode=cleanup', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to clear Gmail sent queue.');
  return data;
}

export function LetterRegisterPage({ type }: { type: LetterType }) {
  const { userProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const isAdmin = userProfile?.role === 'Administrator';
  const collectionName = type === 'incoming' ? 'incomingLetters' : 'outgoingLetters';
  const title = type === 'incoming' ? 'Incoming Letter Register' : 'Outgoing Letter Register';
  const partyLabel = type === 'incoming' ? 'From / Sender' : 'To / Addressee';
  const numberLabel = type === 'incoming' ? 'Letter No.' : 'Dispatch No.';
  const dateLabel = type === 'incoming' ? 'Received Date' : 'Dispatch Date';

  const [letters, setLetters] = useState<Letter[]>([]);
  const [incomingLetters, setIncomingLetters] = useState<Letter[]>([]);
  const [sentItems, setSentItems] = useState<GmailSentItem[]>([]);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewingAttachments, setViewingAttachments] = useState<LetterAttachment[] | null>(null);
  const [search, setSearch] = useState('');
  const [sourceSearch, setSourceSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncingSent, setSyncingSent] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isAdmin || type !== 'incoming') return;
    const gmailId = searchParams.get('gmailId');
    if (!gmailId) return;
    let active = true;

    (async () => {
      try {
        const snapshot = await getDoc(doc(db, 'gmailInbox', gmailId));
        if (!active || !snapshot.exists()) return;
        const mail = snapshot.data() as {
          subject?: string; from?: string; to?: string; date?: string; url?: string; id?: string;
          registeredLetterId?: string;
        };
        if (mail.registeredLetterId) {
          setError('This Gmail message has already been registered as Incoming Dak.');
          return;
        }

        setEditingId(null);
        setForm({
          number: '',
          date: mail.date ? new Date(mail.date).toISOString().slice(0, 10) : today(),
          party: mail.from || '',
          subject: mail.subject || '',
          fileNo: '',
          reference: '',
          remarks: '',
          attachments: [{
            kind: 'email',
            id: mail.id || gmailId,
            name: mail.subject || 'Received Email',
            url: mail.url || 'https://mail.google.com/mail/u/0/#inbox/' + gmailId,
            direction: 'received',
            subject: mail.subject || '',
            from: mail.from,
            to: mail.to,
            date: mail.date,
          }],
          sourceType: 'manual',
          sourceIncomingLetterId: '',
          sourceGmailMessageId: '',
        });
        setShowForm(true);
        setMessage('Gmail message loaded for review. Check the details, add the office information and attachments, then explicitly register it as Incoming Dak.');
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load the Gmail message.');
      }
    })();

    return () => { active = false; };
  }, [isAdmin, type, searchParams]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        setLetters(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Letter)));
      },
      (err) => setError(err.message),
    );
    return unsubscribe;
  }, [collectionName]);

  useEffect(() => {
    if (!isAdmin || type !== 'outgoing') return;

    const unsubscribeIncoming = onSnapshot(
      collection(db, 'incomingLetters'),
      (snapshot) => {
        setIncomingLetters(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Letter)));
      },
      (err) => setError(err.message),
    );

    let active = true;

    void loadSentGmail()
      .then((items) => {
        if (active) setSentItems(items);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load Gmail sent mail.');
      });

    return () => {
      active = false;
      unsubscribeIncoming();
    };
  }, [isAdmin, type]);

  const filteredLetters = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = !q
      ? letters
      : letters.filter((letter) => [
          letter.letterNo, letter.dispatchNo, letter.date, letter.dispatchDate,
          letter.receivedDate, letter.from, letter.to, letter.addressee,
          letter.subject, letter.fileNo, letter.reference, letter.remarks,
          ...(letter.attachments || []).map((item) => item.name),
        ].filter(Boolean).join(' ').toLowerCase().includes(q));

    return [...result].sort((a, b) => {
      const da = a.date || a.dispatchDate || a.receivedDate || '';
      const dbb = b.date || b.dispatchDate || b.receivedDate || '';
      return dbb.localeCompare(da);
    });
  }, [letters, search]);

  const filteredIncomingSources = useMemo(() => {
    const q = sourceSearch.trim().toLowerCase();
    return incomingLetters
      .filter((letter) => {
        if (!q) return true;
        return [
          letter.letterNo, letter.receivedDate, letter.from, letter.subject,
          letter.fileNo, letter.reference, letter.remarks,
        ].filter(Boolean).join(' ').toLowerCase().includes(q);
      })
      .sort((a, b) => (b.receivedDate || '').localeCompare(a.receivedDate || ''))
      .slice(0, 20);
  }, [sourceSearch, incomingLetters]);

  const filteredSentSources = useMemo(() => {
    const q = sourceSearch.trim().toLowerCase();
    return sentItems
      .filter((item) => !item.registeredLetterId)
      .filter((item) => {
        if (!q) return true;
        return [item.subject, item.to, item.cc, item.date, item.snippet]
          .filter(Boolean).join(' ').toLowerCase().includes(q);
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 20);
  }, [sourceSearch, sentItems]);

  const openNew = () => {
    if (!isAdmin) return;
    setEditingId(null);
    setForm(emptyForm());
    setSourceSearch('');
    setError('');
    setMessage('');
    setShowForm(true);
  };

  const openEdit = (letter: Letter) => {
    if (!isAdmin) return;
    setEditingId(letter.id);
    setForm({
      number: letter.letterNo || letter.dispatchNo || '',
      date: letter.date || letter.dispatchDate || letter.receivedDate || '',
      party: letter.from || letter.to || letter.addressee || '',
      subject: letter.subject || '',
      fileNo: letter.fileNo || '',
      reference: letter.reference || '',
      remarks: letter.remarks || '',
      attachments: letter.attachments || [],
      sourceType: letter.sourceType || 'manual',
      sourceIncomingLetterId: letter.sourceIncomingLetterId || '',
      sourceGmailMessageId: letter.sourceGmailMessageId || '',
    });
    setSourceSearch('');
    setError('');
    setMessage('');
    setShowForm(true);
  };

  const closeForm = () => {
    if (!saving) {
      setShowForm(false);
      setEditingId(null);
    }
  };

  const selectIncoming = (letter: Letter) => {
    setForm((current) => ({
      ...current,
      sourceType: 'incoming',
      sourceIncomingLetterId: letter.id,
      sourceGmailMessageId: '',
      party: letter.from || letter.to || letter.addressee || '',
      subject: addRePrefix(letter.subject || ''),
      fileNo: letter.fileNo || '',
      reference: letter.letterNo
        ? 'Incoming Letter No. ' + letter.letterNo
        : letter.reference || '',
      remarks: current.remarks || (
        'Prepared from Incoming Dak dated ' +
        (letter.receivedDate || letter.date || '') +
        (letter.subject ? ': ' + letter.subject : '')
      ),
    }));
    setSourceSearch(letter.subject || letter.from || '');
  };

  const selectSent = (item: GmailSentItem) => {
    setForm((current) => ({
      ...current,
      sourceType: 'gmailSent',
      sourceIncomingLetterId: '',
      sourceGmailMessageId: item.id,
      date: item.date ? new Date(item.date).toISOString().slice(0, 10) : current.date,
      party: item.to || '',
      subject: item.subject || '',
      fileNo: current.fileNo,
      reference: current.reference,
      remarks: current.remarks,
      attachments: [{
        kind: 'email',
        id: item.id,
        name: item.subject || 'Sent Email',
        url: item.url,
        direction: 'sent',
        subject: item.subject || '',
        from: item.from,
        to: item.to,
        date: item.date,
      }],
    }));
    setSourceSearch(item.subject || item.to || '');
  };

  const saveLetter = async (event: FormEvent) => {
    event.preventDefault();
    if (!isAdmin) {
      setError('Only administrators can register or edit letters.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const gmailAttachment = type === 'incoming'
        ? form.attachments.find((item) => item.kind === 'email' && item.direction === 'received')
        : undefined;

      const data = type === 'incoming'
        ? {
            letterNo: form.number,
            receivedDate: form.date,
            from: form.party,
            subject: form.subject,
            fileNo: form.fileNo,
            reference: form.reference,
            remarks: form.remarks,
            attachments: form.attachments,
            ...(gmailAttachment ? {
              source: 'gmail',
              gmailMessageId: gmailAttachment.id,
              gmailUrl: gmailAttachment.url,
            } : {}),
            updatedAt: serverTimestamp(),
          }
        : {
            dispatchNo: form.number,
            dispatchDate: form.date,
            addressee: form.party,
            subject: form.subject,
            fileNo: form.fileNo,
            reference: form.reference,
            remarks: form.remarks,
            attachments: form.attachments,
            sourceType: form.sourceType,
            ...(form.sourceIncomingLetterId ? { sourceIncomingLetterId: form.sourceIncomingLetterId } : {}),
            ...(form.sourceGmailMessageId ? { sourceGmailMessageId: form.sourceGmailMessageId } : {}),
            updatedAt: serverTimestamp(),
          };

      if (editingId) {
        await updateDoc(doc(db, collectionName, editingId), data);
        setMessage('Letter updated successfully.');
      } else {
        const created = await addDoc(collection(db, collectionName), {
          ...data,
          createdAt: serverTimestamp(),
        });

        if (type === 'incoming' && gmailAttachment) {
          await setDoc(doc(db, 'gmailInbox', gmailAttachment.id), {
            registered: true,
            registeredLetterId: created.id,
            registeredAt: serverTimestamp(),
            registeredBy: userProfile?.uid || '',
            reviewStatus: 'registered',
          }, { merge: true });
        }

        if (type === 'outgoing' && form.sourceGmailMessageId) {
          await setDoc(doc(db, 'gmailSent', form.sourceGmailMessageId), {
            registered: true,
            registeredLetterId: created.id,
            registeredAt: serverTimestamp(),
            registeredBy: userProfile?.uid || '',
            reviewStatus: 'registered',
          }, { merge: true });
        }

        setMessage('Letter registered successfully.');
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
    } catch (err) {
      const firebaseError = err as { code?: string; message?: string };
      if (firebaseError.code === 'permission-denied') {
        setError('Permission denied. Your administrator session may be stale. Sign out and sign in again, then retry.');
      } else {
        setError(firebaseError.message || 'Unable to save the letter.');
      }
    } finally {
      setSaving(false);
    }
  };

  const removeLetter = async (id: string) => {
    if (!isAdmin) {
      setError('Only administrators can delete letters.');
      return;
    }
    if (!window.confirm('Delete this letter record? This cannot be undone.')) return;

    setError('');
    setMessage('');

    try {
      await deleteDoc(doc(db, collectionName, id));
      setMessage('Letter deleted successfully.');
    } catch (err) {
      const firebaseError = err as { code?: string; message?: string };
      if (firebaseError.code === 'permission-denied') {
        setError('Permission denied. Your administrator session may be stale. Sign out and sign in again, then retry.');
      } else {
        setError(firebaseError.message || 'Unable to delete the letter.');
      }
    }
  };

  const handleSentSync = async () => {
    setSyncingSent(true);
    setError('');
    setMessage('');
    try {
      const data = await syncSentGmail();
      const items = await loadSentGmail();
      setSentItems(items);
      setMessage(
        'Gmail Sent sync complete. ' +
        (data.processed || 0) +
        ' official sent messages imported, ' +
        (data.skippedFiltered || 0) +
        ' non-official sent messages filtered out, and ' +
        (data.createdPending || 0) +
        ' new messages added to the selection queue.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sync Gmail sent mail.');
    } finally {
      setSyncingSent(false);
    }
  };

  const handleSentCleanup = async () => {
    if (!window.confirm('Clear all unregistered Gmail Sent review-queue entries? This does not delete anything from Gmail or the Outgoing Letter Register.')) return;

    setSyncingSent(true);
    setError('');
    setMessage('');

    try {
      const data = await cleanupSentGmail();
      setMessage('Gmail Sent selection queue cleared. Deleted ' + (data.deleted || 0) + ' unregistered entries. Gmail messages were not deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to clear Gmail sent queue.');
    } finally {
      setSyncingSent(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/dashboard" className="text-2xl font-bold text-blue-900">Office Letter Register</Link>
          <div className="flex items-center gap-4">
            <Link to="/reports" className="text-purple-700 hover:text-purple-900 flex items-center gap-2 font-semibold">
              <Download size={17} /> Reports
            </Link>
            <Link to="/dashboard" className="text-blue-600 hover:text-blue-800 flex items-center gap-2">
              <ArrowLeft size={18} /> Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
            <p className="text-slate-600 mt-1">{letters.length} record{letters.length === 1 ? '' : 's'} in Firestore</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isAdmin && type === 'outgoing' && (
              <>
                <button
                  onClick={() => void handleSentCleanup()}
                  disabled={syncingSent}
                  className="inline-flex items-center gap-2 border border-amber-200 bg-white hover:bg-amber-50 disabled:opacity-60 text-amber-800 px-4 py-3 rounded-lg font-semibold"
                >
                  Clear Sent Queue
                </button>
                <button
                  onClick={() => void handleSentSync()}
                  disabled={syncingSent}
                  className="inline-flex items-center gap-2 border border-blue-200 bg-white hover:bg-blue-50 disabled:opacity-60 text-blue-800 px-4 py-3 rounded-lg font-semibold"
                >
                  <Send size={18} /> {syncingSent ? 'Syncing Sent...' : 'Sync Gmail Sent'}
                </button>
              </>
            )}
            {isAdmin && (
              <button onClick={openNew} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-semibold">
                <Plus size={19} /> Register {type === 'incoming' ? 'Incoming' : 'Outgoing'} Letter
              </button>
            )}
          </div>
        </div>

        {!isAdmin && (
          <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
            You have read-only access. Only administrators can register, edit or delete letter records.
          </div>
        )}

        {message && <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700">{message}</div>}
        {error && <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>}

        {isAdmin && type === 'outgoing' && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <strong>New outgoing workflow:</strong> keep <strong>Manual Entry</strong> for physical letters, or choose an existing <strong>Incoming Letter</strong> / <strong>Gmail Sent</strong> message and the system will prefill the register fields. Selecting a source never deletes or modifies the original record.
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={20} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by number, date, sender/addressee, subject, file no. or reference..."
              className="w-full pl-10 pr-4 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {filteredLetters.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <p className="text-lg font-semibold">No letters found</p>
              <p className="mt-1">{letters.length ? 'Try a different search.' : isAdmin ? 'Click the button above to register the first letter.' : 'No letters have been registered yet.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3">No.</th>
                    <th className="text-left px-4 py-3">{dateLabel}</th>
                    <th className="text-left px-4 py-3">{partyLabel}</th>
                    <th className="text-left px-4 py-3">Subject</th>
                    <th className="text-left px-4 py-3">File No.</th>
                    <th className="text-left px-4 py-3">Reference</th>
                    <th className="text-left px-4 py-3">Attachments</th>
                    {isAdmin && <th className="text-left px-4 py-3">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLetters.map((letter) => (
                    <tr key={letter.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4 font-semibold text-slate-900">{letter.letterNo || letter.dispatchNo || '—'}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{letter.receivedDate || letter.dispatchDate || letter.date || '—'}</td>
                      <td className="px-4 py-4">{letter.from || letter.to || letter.addressee || '—'}</td>
                      <td className="px-4 py-4 min-w-[220px]">{letter.subject || '—'}</td>
                      <td className="px-4 py-4">{letter.fileNo || '—'}</td>
                      <td className="px-4 py-4">{letter.reference || '—'}</td>
                      <td className="px-4 py-4">
                        {letter.attachments?.length ? (
                          <button
                            type="button"
                            onClick={() => setViewingAttachments(letter.attachments || [])}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            <Paperclip size={15} /> {letter.attachments.length}
                          </button>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(letter)} title="Edit" className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"><Edit3 size={17} /></button>
                            <button onClick={() => void removeLetter(letter.id)} title="Delete" className="p-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100"><Trash2 size={17} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showForm && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {editingId
                    ? 'Edit Letter'
                    : type === 'incoming'
                      ? (searchParams.get('gmailId') ? 'Review & Register Incoming Dak' : 'Register New Incoming Letter')
                      : 'Register New Outgoing Letter'}
                </h2>
                <p className="text-slate-500 mt-1">
                  {type === 'outgoing'
                    ? 'Choose the source, verify the information, then enter the dispatch details.'
                    : searchParams.get('gmailId')
                      ? 'Verify the imported Gmail message before it enters the official register.'
                      : title}
                </p>
              </div>
              <button onClick={closeForm} className="p-2 hover:bg-slate-100 rounded-lg"><X /></button>
            </div>

            <form onSubmit={saveLetter} className="p-6 space-y-5">
              {type === 'outgoing' && !editingId && (
                <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-center gap-2 font-bold text-slate-900 mb-3">
                    <Send size={18} className="text-blue-700" /> How do you want to create this outgoing letter?
                  </div>

                  <div className="grid md:grid-cols-3 gap-3">
                    {([
                      ['manual', 'Manual Entry', 'For physical/offline letters'],
                      ['incoming', 'From Incoming Letter', 'Reuse an existing Incoming Dak'],
                      ['gmailSent', 'From Gmail Sent', 'Reuse an official sent email'],
                    ] as const).map(([value, label, description]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setForm((current) => ({
                            ...current,
                            sourceType: value,
                            sourceIncomingLetterId: '',
                            sourceGmailMessageId: '',
                          }));
                          setSourceSearch('');
                        }}
                        className={
                          form.sourceType === value
                            ? 'rounded-lg border-2 border-blue-600 bg-white p-4 text-left shadow-sm'
                            : 'rounded-lg border border-slate-300 bg-white p-4 text-left hover:border-blue-400'
                        }
                      >
                        <div className="font-semibold text-slate-900">{label}</div>
                        <div className="text-xs text-slate-500 mt-1">{description}</div>
                      </button>
                    ))}
                  </div>

                  {form.sourceType !== 'manual' && (
                    <div className="mt-4 rounded-lg border bg-white p-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input
                          value={sourceSearch}
                          onChange={(e) => setSourceSearch(e.target.value)}
                          placeholder={
                            form.sourceType === 'incoming'
                              ? 'Search Incoming Letters by subject, sender, letter no., file no...'
                              : 'Search Gmail Sent by subject, recipient or date...'
                          }
                          className="w-full pl-10 pr-4 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="mt-3 max-h-64 overflow-y-auto space-y-2">
                        {form.sourceType === 'incoming' ? (
                          filteredIncomingSources.length ? filteredIncomingSources.map((letter) => (
                            <button
                              key={letter.id}
                              type="button"
                              onClick={() => selectIncoming(letter)}
                              className={form.sourceIncomingLetterId === letter.id
                                ? 'w-full rounded-lg border-2 border-blue-500 bg-blue-50 p-3 text-left'
                                : 'w-full rounded-lg border bg-slate-50 p-3 text-left hover:bg-blue-50'}
                            >
                              <div className="font-semibold text-slate-900">{letter.subject || '(No subject)'}</div>
                              <div className="text-xs text-slate-600 mt-1">
                                {letter.letterNo || 'No letter no.'} • {letter.receivedDate || letter.date || 'No date'} • {letter.from || 'No sender'}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                {letter.fileNo ? 'File: ' + letter.fileNo + ' • ' : ''}{letter.reference || ''}
                              </div>
                            </button>
                          )) : (
                            <div className="p-5 text-center text-sm text-slate-500">No Incoming Letters match this search.</div>
                          )
                        ) : (
                          <>
                            {filteredSentSources.length ? filteredSentSources.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => selectSent(item as GmailSentItem)}
                                className={form.sourceGmailMessageId === item.id
                                  ? 'w-full rounded-lg border-2 border-emerald-500 bg-emerald-50 p-3 text-left'
                                  : 'w-full rounded-lg border bg-slate-50 p-3 text-left hover:bg-emerald-50'}
                              >
                                <div className="font-semibold text-slate-900">{item.subject || '(No subject)'}</div>
                                <div className="text-xs text-slate-600 mt-1">
                                  To: {item.to || 'Unknown recipient'} • {formatDate(item.date)}
                                </div>
                                <div className="text-xs text-slate-500 mt-1 line-clamp-2">{item.snippet || 'No message preview.'}</div>
                              </button>
                            )) : (
                              <div className="p-5 text-center text-sm text-slate-500">
                                No Gmail Sent messages are available. Click <strong>Sync Gmail Sent</strong> on the register page, then open this form again.
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {type === 'outgoing' && editingId && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Source: <strong>{
                    form.sourceType === 'incoming'
                      ? 'Incoming Letter'
                      : form.sourceType === 'gmailSent'
                        ? 'Gmail Sent'
                        : 'Manual Entry'
                  }</strong>
                </div>
              )}

              {type === 'outgoing' && form.sourceType === 'incoming' && form.sourceIncomingLetterId && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  <strong>Linked Incoming Dak:</strong>{' '}
                  {incomingLetters.find((item) => item.id === form.sourceIncomingLetterId)?.subject || 'Selected incoming letter'}
                  <span className="ml-2 text-blue-700">(The incoming record remains unchanged.)</span>
                </div>
              )}

              {type === 'outgoing' && form.sourceType === 'gmailSent' && form.sourceGmailMessageId && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  <strong>Linked Gmail Sent:</strong>{' '}
                  {sentItems.find((item) => item.id === form.sourceGmailMessageId)?.subject || 'Selected sent email'}
                  <span className="ml-2 text-emerald-700">(The original Gmail message remains in Gmail.)</span>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-5">
                <label className="block">
                  <span className="block text-sm font-semibold text-slate-700 mb-2">{numberLabel} *</span>
                  <input required value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" />
                </label>
                <label className="block">
                  <span className="block text-sm font-semibold text-slate-700 mb-2">{dateLabel} *</span>
                  <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" />
                </label>
              </div>

              <label className="block">
                <span className="block text-sm font-semibold text-slate-700 mb-2">{partyLabel} *</span>
                <input required value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value })} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" />
              </label>

              <label className="block">
                <span className="block text-sm font-semibold text-slate-700 mb-2">Subject *</span>
                <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" />
              </label>

              <div className="grid md:grid-cols-2 gap-5">
                <label className="block">
                  <span className="block text-sm font-semibold text-slate-700 mb-2">File No.</span>
                  <input value={form.fileNo} onChange={(e) => setForm({ ...form, fileNo: e.target.value })} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" />
                </label>
                <label className="block">
                  <span className="block text-sm font-semibold text-slate-700 mb-2">Reference</span>
                  <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" />
                </label>
              </div>

              <label className="block">
                <span className="block text-sm font-semibold text-slate-700 mb-2">Remarks</span>
                <textarea rows={3} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" />
              </label>

              <AttachmentsSection
                attachments={form.attachments}
                setAttachments={(attachments) => setForm({ ...form, attachments })}
              />

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeForm} disabled={saving} className="px-5 py-3 border rounded-lg font-semibold">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-semibold">
                  {saving
                    ? 'Registering...'
                    : editingId
                      ? 'Update Letter'
                      : searchParams.get('gmailId') && type === 'incoming'
                        ? 'Approve & Register Incoming Dak'
                        : 'Save Letter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingAttachments && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewingAttachments(null); }}>
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Attachments</h2>
                <p className="text-sm text-slate-500">{viewingAttachments.length} linked item{viewingAttachments.length === 1 ? '' : 's'}</p>
              </div>
              <button onClick={() => setViewingAttachments(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
            </div>
            <div className="max-h-[70vh] space-y-2 overflow-y-auto p-5">
              {viewingAttachments.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-slate-50 px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-500">
                      {item.kind === 'email' ? (item.direction === 'received' ? 'Received Email' : 'Sent Email') : 'Google Drive'}
                      {item.kind === 'email' && item.date ? ' • ' + item.date : ''}
                    </div>
                  </div>
                  <a href={item.url} target="_blank" rel="noreferrer" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">Open</a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
