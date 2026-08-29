import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { ArrowLeft, Edit3, Plus, Search, Trash2, X } from 'lucide-react';
import { db } from '../firebase/config';
import { useAuth } from '../firebase/auth-context';

type LetterType = 'incoming' | 'outgoing';

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
}

interface FormData {
  number: string;
  date: string;
  party: string;
  subject: string;
  fileNo: string;
  reference: string;
  remarks: string;
}

const emptyForm: FormData = {
  number: '',
  date: new Date().toISOString().slice(0, 10),
  party: '',
  subject: '',
  fileNo: '',
  reference: '',
  remarks: '',
};

export function LetterRegisterPage({ type }: { type: LetterType }) {
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.role === 'admin';
  const collectionName = type === 'incoming' ? 'incomingLetters' : 'outgoingLetters';
  const title = type === 'incoming' ? 'Incoming Letter Register' : 'Outgoing Letter Register';
  const partyLabel = type === 'incoming' ? 'From / Sender' : 'To / Addressee';
  const numberLabel = type === 'incoming' ? 'Letter No.' : 'Dispatch No.';
  const dateLabel = type === 'incoming' ? 'Received Date' : 'Dispatch Date';

  const [letters, setLetters] = useState<Letter[]>([]);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        setLetters(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Letter)));
      },
      (err) => setError(err.message)
    );
    return unsubscribe;
  }, [collectionName]);

  const filteredLetters = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = !q
      ? letters
      : letters.filter((letter) =>
          [
            letter.letterNo, letter.dispatchNo, letter.date, letter.dispatchDate,
            letter.receivedDate, letter.from, letter.to, letter.addressee,
            letter.subject, letter.fileNo, letter.reference, letter.remarks,
          ].filter(Boolean).join(' ').toLowerCase().includes(q)
        );

    return [...result].sort((a, b) => {
      const da = a.date || a.dispatchDate || a.receivedDate || '';
      const dbb = b.date || b.dispatchDate || b.receivedDate || '';
      return dbb.localeCompare(da);
    });
  }, [letters, search]);

  const openNew = () => {
    if (!isAdmin) return;
    setEditingId(null);
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
    setError('');
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
    });
    setError('');
    setShowForm(true);
  };

  const closeForm = () => {
    if (!saving) {
      setShowForm(false);
      setEditingId(null);
    }
  };

  const saveLetter = async (event: FormEvent) => {
    event.preventDefault();
    if (!isAdmin) {
      setError('Only administrators can register or edit letters.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const data = type === 'incoming'
        ? {
            letterNo: form.number,
            receivedDate: form.date,
            from: form.party,
            subject: form.subject,
            fileNo: form.fileNo,
            reference: form.reference,
            remarks: form.remarks,
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
            updatedAt: serverTimestamp(),
          };

      if (editingId) {
        await updateDoc(doc(db, collectionName, editingId), data);
      } else {
        await addDoc(collection(db, collectionName), { ...data, createdAt: serverTimestamp() });
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save the letter.');
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
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete the letter.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/dashboard" className="text-2xl font-bold text-blue-900">Office Letter Register</Link>
          <Link to="/dashboard" className="text-blue-600 hover:text-blue-800 flex items-center gap-2">
            <ArrowLeft size={18} /> Dashboard
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
            <p className="text-slate-600 mt-1">{letters.length} record{letters.length === 1 ? '' : 's'} in Firestore</p>
          </div>
          {isAdmin && (
            <button onClick={openNew} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-semibold">
              <Plus size={19} /> Register {type === 'incoming' ? 'Incoming' : 'Outgoing'} Letter
            </button>
          )}
        </div>

        {!isAdmin && (
          <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
            You have read-only access. Only administrators can register, edit or delete letter records.
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

        {error && <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>}

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
                      {isAdmin && (
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(letter)} title="Edit" className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"><Edit3 size={17} /></button>
                            <button onClick={() => removeLetter(letter.id)} title="Delete" className="p-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100"><Trash2 size={17} /></button>
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{editingId ? 'Edit Letter' : 'Register New Letter'}</h2>
                <p className="text-slate-500 mt-1">{title}</p>
              </div>
              <button onClick={closeForm} className="p-2 hover:bg-slate-100 rounded-lg"><X /></button>
            </div>

            <form onSubmit={saveLetter} className="p-6 space-y-5">
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

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeForm} disabled={saving} className="px-5 py-3 border rounded-lg font-semibold">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-semibold">
                  {saving ? 'Saving...' : editingId ? 'Update Letter' : 'Save Letter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
