import { useState } from 'react';
import { ExternalLink, FileText, FolderOpen, Mail, Paperclip, Plus, Trash2, X } from 'lucide-react';

export type LetterAttachment =
  | {
      kind: 'drive';
      id: string;
      name: string;
      url: string;
      mimeType?: string;
    }
  | {
      kind: 'email';
      id: string;
      name: string;
      url: string;
      direction: 'received' | 'sent';
      subject: string;
      from?: string;
      to?: string;
      date?: string;
    };

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

function loadScript(src: string, id: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load Google services.'));
    document.head.appendChild(script);
  });
}

async function waitFor(check: () => boolean, timeout = 10000) {
  const started = Date.now();
  while (!check()) {
    if (Date.now() - started > timeout) throw new Error('Google services took too long to load.');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

export function AttachmentsSection({
  attachments,
  setAttachments,
  disabled = false,
}: {
  attachments: LetterAttachment[];
  setAttachments: (items: LetterAttachment[]) => void;
  disabled?: boolean;
}) {
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState({
    direction: 'received' as 'received' | 'sent',
    subject: '',
    from: '',
    to: '',
    date: new Date().toISOString().slice(0, 10),
    url: '',
  });
  const [driveBusy, setDriveBusy] = useState(false);
  const [error, setError] = useState('');

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter((item) => item.id !== id));
  };

  const addEmail = () => {
    if (!email.subject.trim() || !email.url.trim()) {
      setError('Email subject and Gmail URL are required.');
      return;
    }
    const id = 'email-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    setAttachments([
      ...attachments,
      {
        kind: 'email',
        id,
        name: email.subject.trim(),
        url: email.url.trim(),
        direction: email.direction,
        subject: email.subject.trim(),
        from: email.from.trim() || undefined,
        to: email.to.trim() || undefined,
        date: email.date || undefined,
      },
    ]);
    setEmail({
      direction: 'received',
      subject: '',
      from: '',
      to: '',
      date: new Date().toISOString().slice(0, 10),
      url: '',
    });
    setError('');
    setShowEmail(false);
  };

  const openDrivePicker = async () => {
    setError('');
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    const apiKey = import.meta.env.VITE_GOOGLE_PICKER_API_KEY as string | undefined;
    const appId = import.meta.env.VITE_GOOGLE_DRIVE_APP_ID as string | undefined;

    if (!clientId || !apiKey || !appId) {
      setError('Google Drive Picker is not configured yet. Add VITE_GOOGLE_CLIENT_ID, VITE_GOOGLE_PICKER_API_KEY and VITE_GOOGLE_DRIVE_APP_ID in Vercel Environment Variables.');
      return;
    }

    setDriveBusy(true);
    try {
      await Promise.all([
        loadScript('https://apis.google.com/js/api.js', 'google-api-loader'),
        loadScript('https://accounts.google.com/gsi/client', 'google-identity-services'),
      ]);
      await waitFor(() => Boolean(window.gapi && window.google?.accounts?.oauth2));
      await new Promise<void>((resolve, reject) => {
        window.gapi.load('picker', {
          callback: () => resolve(),
          onerror: () => reject(new Error('Google Picker failed to load.')),
        });
      });

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: () => {},
      });

      tokenClient.callback = (response: any) => {
        if (response.error) {
          setError(response.error_description || 'Google Drive authorization was cancelled.');
          setDriveBusy(false);
          return;
        }

        const picker = new window.google.picker.PickerBuilder()
          .addView(window.google.picker.ViewId.DOCS)
          .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
          .setOAuthToken(response.access_token)
          .setDeveloperKey(apiKey)
          .setAppId(appId)
          .setCallback((data: any) => {
            if (data.action === window.google.picker.Action.PICKED) {
              const docs = data[window.google.picker.Response.DOCUMENTS] || [];
              const selected = docs.map((doc: any) => ({
                kind: 'drive' as const,
                id: doc[window.google.picker.Document.ID],
                name: doc[window.google.picker.Document.NAME] || 'Google Drive file',
                url: doc[window.google.picker.Document.URL],
                mimeType: doc[window.google.picker.Document.MIME_TYPE],
              }));
              const existingIds = new Set(attachments.filter((item) => item.kind === 'drive').map((item) => item.id));
              setAttachments([...attachments, ...selected.filter((item: LetterAttachment) => !existingIds.has(item.id))]);
            }
            setDriveBusy(false);
          })
          .build();

        picker.setVisible(true);
      };

      tokenClient.requestAccessToken({ prompt: '' });
    } catch (err) {
      setDriveBusy(false);
      setError(err instanceof Error ? err.message : 'Unable to open Google Drive Picker.');
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <Paperclip size={19} className="text-blue-700" />
            Attachments & References
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Link received/sent emails and supporting files from Google Drive.
          </p>
        </div>
        {!disabled && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setError(''); setShowEmail(true); }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Mail size={16} /> Attach Email
            </button>
            <button
              type="button"
              onClick={() => void openDrivePicker()}
              disabled={driveBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
            >
              <FolderOpen size={16} /> {driveBusy ? 'Opening Drive...' : 'Attach from Google Drive'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {attachments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
          No attachments linked to this letter yet.
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className={item.kind === 'email' ? 'rounded-lg bg-amber-50 p-2 text-amber-700' : 'rounded-lg bg-blue-50 p-2 text-blue-700'}>
                  {item.kind === 'email' ? <Mail size={18} /> : <FileText size={18} />}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900 truncate max-w-[420px]">{item.name}</span>
                    {item.kind === 'email' && (
                      <span className={item.direction === 'received' ? 'rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700' : 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700'}>
                        {item.direction === 'received' ? 'Received' : 'Sent'}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {item.kind === 'email'
                      ? [item.from && 'From: ' + item.from, item.to && 'To: ' + item.to, item.date].filter(Boolean).join(' • ')
                      : ['Google Drive', item.mimeType].filter(Boolean).join(' • ')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                  <ExternalLink size={15} /> Open
                </a>
                {!disabled && (
                  <button type="button" onClick={() => removeAttachment(item.id)} className="rounded-lg bg-red-50 p-2 text-red-700 hover:bg-red-100" title="Remove attachment">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showEmail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowEmail(false); }}>
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Attach Email</h3>
                <p className="text-sm text-slate-500">Link the received or sent Gmail message to this letter.</p>
              </div>
              <button type="button" onClick={() => setShowEmail(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Email type *</span>
                  <select value={email.direction} onChange={(e) => setEmail({ ...email, direction: e.target.value as 'received' | 'sent' })} className="w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="received">Received Email</option>
                    <option value="sent">Sent Email</option>
                  </select>
                </label>
                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Date</span>
                  <input type="date" value={email.date} onChange={(e) => setEmail({ ...email, date: e.target.value })} className="w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500" />
                </label>
              </div>
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">Subject *</span>
                <input value={email.subject} onChange={(e) => setEmail({ ...email, subject: e.target.value })} placeholder="Email subject" className="w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-700">{email.direction === 'received' ? 'From' : 'From'}</span>
                  <input value={email.from} onChange={(e) => setEmail({ ...email, from: e.target.value })} placeholder="name@example.com" className="w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500" />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-700">To</span>
                  <input value={email.to} onChange={(e) => setEmail({ ...email, to: e.target.value })} placeholder="recipient@example.com" className="w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500" />
                </label>
              </div>
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">Gmail message link *</span>
                <input type="url" required value={email.url} onChange={(e) => setEmail({ ...email, url: e.target.value })} placeholder="https://mail.google.com/mail/u/0/#..." className="w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500" />
              </label>
              <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                Tip: open the message in Gmail and copy its URL. The register stores the reference; the email itself remains in Gmail.
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowEmail(false)} className="rounded-lg border px-4 py-2.5 font-semibold">Cancel</button>
                <button type="button" onClick={addEmail} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700"><Plus size={17} /> Attach Email</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
