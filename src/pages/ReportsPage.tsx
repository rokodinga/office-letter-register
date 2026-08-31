import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, FileSpreadsheet, FileText, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { db } from '../firebase/config';
import { useAuth } from '../firebase/auth-context';

type ReportType = 'incoming' | 'outgoing' | 'both';

interface LetterAttachment {
  id: string;
  name?: string;
}

interface Letter {
  id: string;
  letterNo?: string;
  dispatchNo?: string;
  receivedDate?: string;
  dispatchDate?: string;
  from?: string;
  to?: string;
  addressee?: string;
  subject?: string;
  fileNo?: string;
  reference?: string;
  remarks?: string;
  attachments?: LetterAttachment[];
  source?: string;
  sourceType?: string;
}

interface ReportRow {
  type: 'Incoming' | 'Outgoing';
  number: string;
  date: string;
  party: string;
  subject: string;
  fileNo: string;
  reference: string;
  remarks: string;
  source: string;
  attachments: number;
}

function clean(value?: string) {
  return (value || '').replace(/\\s+/g, ' ').trim();
}

function reportSource(letter: Letter, type: 'Incoming' | 'Outgoing') {
  if (type === 'Incoming') return letter.source === 'gmail' ? 'Gmail' : 'Manual';
  if (letter.sourceType === 'incoming') return 'From Incoming Letter';
  if (letter.sourceType === 'gmailSent') return 'Gmail Sent';
  return 'Manual';
}

function toRow(letter: Letter, type: 'Incoming' | 'Outgoing'): ReportRow {
  return {
    type,
    number: clean(letter.letterNo || letter.dispatchNo),
    date: clean(letter.receivedDate || letter.dispatchDate),
    party: clean(letter.from || letter.to || letter.addressee),
    subject: clean(letter.subject),
    fileNo: clean(letter.fileNo),
    reference: clean(letter.reference),
    remarks: clean(letter.remarks),
    source: reportSource(letter, type),
    attachments: letter.attachments?.length || 0,
  };
}

function sortRows(rows: ReportRow[]) {
  return [...rows].sort((a, b) => b.date.localeCompare(a.date) || a.number.localeCompare(b.number));
}

function safeFileDate() {
  return new Date().toISOString().slice(0, 10);
}

function makeFileName(type: ReportType, format: string) {
  const label = type === 'both' ? 'Incoming-and-Outgoing' : type === 'incoming' ? 'Incoming' : 'Outgoing';
  return label + '-Letter-Report-' + safeFileDate() + '.' + format;
}

export function ReportsPage() {
  const { userProfile } = useAuth();
  const [incoming, setIncoming] = useState<Letter[]>([]);
  const [outgoing, setOutgoing] = useState<Letter[]>([]);
  const [reportType, setReportType] = useState<ReportType>('both');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubIncoming = onSnapshot(
      collection(db, 'incomingLetters'),
      (snapshot) => setIncoming(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Letter))),
      (err) => setError(err.message),
    );
    const unsubOutgoing = onSnapshot(
      collection(db, 'outgoingLetters'),
      (snapshot) => setOutgoing(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Letter))),
      (err) => setError(err.message),
    );
    return () => {
      unsubIncoming();
      unsubOutgoing();
    };
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sourceRows: ReportRow[] = [];

    if (reportType !== 'outgoing') {
      sourceRows.push(...incoming.map((letter) => toRow(letter, 'Incoming')));
    }
    if (reportType !== 'incoming') {
      sourceRows.push(...outgoing.map((letter) => toRow(letter, 'Outgoing')));
    }

    const filtered = sourceRows.filter((row) => {
      if (fromDate && row.date && row.date < fromDate) return false;
      if (toDate && row.date && row.date > toDate) return false;
      if (!q) return true;
      return [
        row.type, row.number, row.date, row.party, row.subject,
        row.fileNo, row.reference, row.remarks, row.source,
      ].join(' ').toLowerCase().includes(q);
    });

    return sortRows(filtered);
  }, [incoming, outgoing, reportType, fromDate, toDate, search]);

  const incomingRows = useMemo(() => rows.filter((row) => row.type === 'Incoming'), [rows]);
  const outgoingRows = useMemo(() => rows.filter((row) => row.type === 'Outgoing'), [rows]);

  const exportExcel = () => {
    if (!rows.length) {
      setError('There are no records matching the selected report filters.');
      return;
    }

    setError('');
    setMessage('');

    const workbook = XLSX.utils.book_new();
    const makeSheet = (items: ReportRow[]) => XLSX.utils.json_to_sheet(items.map((row, index) => ({
      'S.No.': index + 1,
      'Type': row.type,
      'Letter / Dispatch No.': row.number,
      'Date': row.date,
      'From / To': row.party,
      'Subject': row.subject,
      'File No.': row.fileNo,
      'Reference': row.reference,
      'Remarks': row.remarks,
      'Source': row.source,
      'Attachments': row.attachments,
    })));

    const summary = XLSX.utils.json_to_sheet([
      { 'Report': 'Office Letter Register', 'Generated On': new Date().toLocaleString(), 'Total Records': rows.length },
      { 'Report Type': reportType === 'both' ? 'Incoming + Outgoing' : reportType === 'incoming' ? 'Incoming' : 'Outgoing', 'From Date': fromDate || 'All', 'To Date': toDate || 'All' },
      { 'Incoming Records': incomingRows.length, 'Outgoing Records': outgoingRows.length },
    ]);
    XLSX.utils.book_append_sheet(workbook, summary, 'Summary');

    if (incomingRows.length) XLSX.utils.book_append_sheet(workbook, makeSheet(incomingRows), 'Incoming Letters');
    if (outgoingRows.length) XLSX.utils.book_append_sheet(workbook, makeSheet(outgoingRows), 'Outgoing Letters');

    XLSX.writeFile(workbook, makeFileName(reportType, 'xlsx'));
    setMessage('Excel report downloaded successfully.');
  };

  const exportPdf = () => {
    if (!rows.length) {
      setError('There are no records matching the selected report filters.');
      return;
    }

    setError('');
    setMessage('');

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const title = reportType === 'both' ? 'Incoming & Outgoing Letter Report' : reportType === 'incoming' ? 'Incoming Letter Report' : 'Outgoing Letter Report';

    const drawHeader = (pageTitle: string) => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(15);
      pdf.text(pageTitle, margin, 12);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      const filters = [
        fromDate ? 'From: ' + fromDate : 'From: All',
        toDate ? 'To: ' + toDate : 'To: All',
        search.trim() ? 'Search: ' + search.trim() : 'Search: All',
      ].join('  |  ');
      pdf.text(filters, margin, 18);
      pdf.text('Generated: ' + new Date().toLocaleString(), pageWidth - margin, 12, { align: 'right' });
      pdf.line(margin, 21, pageWidth - margin, 21);
    };

    const drawTable = (items: ReportRow[], sectionTitle: string) => {
      let y = 28;
      const widths = [9, 23, 20, 43, 68, 25, 32, 43, 12];
      const headers = ['#', 'No.', 'Date', 'From / To', 'Subject', 'File No.', 'Reference', 'Source', 'Att.'];
      const xPositions = widths.reduce<number[]>((acc, width, index) => {
        acc.push(index === 0 ? margin : acc[index - 1] + widths[index - 1]);
        return acc;
      }, []);

      const drawColumnHeader = () => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.text(sectionTitle, margin, y);
        y += 5;
        pdf.rect(margin, y - 4, widths.reduce((a, b) => a + b, 0), 7);
        headers.forEach((header, index) => pdf.text(header, xPositions[index] + 1, y));
        y += 5;
        pdf.setFont('helvetica', 'normal');
      };

      if (!items.length) return;
      drawColumnHeader();

      items.forEach((row, index) => {
        const values = [
          String(index + 1), row.number || '—', row.date || '—',
          row.party || '—', row.subject || '—', row.fileNo || '—',
          row.reference || '—', row.source, String(row.attachments),
        ];
        const wrapped = values.map((value, i) => pdf.splitTextToSize(value, widths[i] - 2));
        const lineCount = Math.max(...wrapped.map((lines) => lines.length));
        const rowHeight = Math.max(7, lineCount * 3.2 + 2);

        if (y + rowHeight > pageHeight - 10) {
          pdf.addPage();
          drawHeader(title);
          y = 28;
          drawColumnHeader();
        }

        pdf.rect(margin, y - 4, widths.reduce((a, b) => a + b, 0), rowHeight);
        wrapped.forEach((lines, i) => {
          pdf.text(lines, xPositions[i] + 1, y, { baseline: 'top' });
        });
        y += rowHeight;
      });

      return y;
    };

    drawHeader(title);
    if (reportType === 'both') {
      drawTable(incomingRows, 'Incoming Letters');
      if (outgoingRows.length) {
        pdf.addPage();
        drawHeader(title);
        drawTable(outgoingRows, 'Outgoing Letters');
      }
    } else {
      drawTable(rows, reportType === 'incoming' ? 'Incoming Letters' : 'Outgoing Letters');
    }

    const pageCount = pdf.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      pdf.setPage(page);
      pdf.setFontSize(7);
      pdf.text('Page ' + page + ' of ' + pageCount, pageWidth - margin, pageHeight - 5, { align: 'right' });
    }

    pdf.save(makeFileName(reportType, 'pdf'));
    setMessage('PDF report downloaded successfully.');
  };

  const clearFilters = () => {
    setFromDate('');
    setToDate('');
    setSearch('');
  };

  const isAdmin = userProfile?.role === 'Administrator';

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
            <h1 className="text-3xl font-bold text-slate-900">Letter Reports</h1>
            <p className="text-slate-600 mt-1">Download filtered Incoming and Outgoing Letter Register reports.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportExcel} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-lg font-semibold">
              <FileSpreadsheet size={18} /> Download Excel
            </button>
            <button onClick={exportPdf} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold">
              <FileText size={18} /> Download PDF
            </button>
          </div>
        </div>

        {message && <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">{message}</div>}
        {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}

        <section className="bg-white rounded-xl shadow-sm border p-5 mb-6">
          <h2 className="font-bold text-slate-900 mb-4">Report filters</h2>
          <div className="grid md:grid-cols-5 gap-4">
            <label>
              <span className="block text-sm font-semibold text-slate-700 mb-2">Report Type</span>
              <select value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)} className="w-full border rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500">
                <option value="both">Incoming + Outgoing</option>
                <option value="incoming">Incoming only</option>
                <option value="outgoing">Outgoing only</option>
              </select>
            </label>
            <label>
              <span className="block text-sm font-semibold text-slate-700 mb-2">From Date</span>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full border rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label>
              <span className="block text-sm font-semibold text-slate-700 mb-2">To Date</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full border rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="md:col-span-2">
              <span className="block text-sm font-semibold text-slate-700 mb-2">Search</span>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-3 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Subject, sender, number, file no., reference..." className="w-full border rounded-lg pl-10 pr-3 py-3 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-600">
              Showing <strong>{rows.length}</strong> record{rows.length === 1 ? '' : 's'} — Incoming: <strong>{incomingRows.length}</strong>, Outgoing: <strong>{outgoingRows.length}</strong>
            </div>
            <button onClick={clearFilters} className="text-sm font-semibold text-blue-700 hover:text-blue-900">Clear filters</button>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {rows.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No records match the selected filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">No.</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">From / To</th>
                    <th className="text-left px-4 py-3">Subject</th>
                    <th className="text-left px-4 py-3">File No.</th>
                    <th className="text-left px-4 py-3">Reference</th>
                    <th className="text-left px-4 py-3">Source</th>
                    <th className="text-left px-4 py-3">Att.</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row, index) => (
                    <tr key={row.type + '-' + row.number + '-' + row.date + '-' + index} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold">{row.type}</td>
                      <td className="px-4 py-3 font-semibold">{row.number || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{row.date || '—'}</td>
                      <td className="px-4 py-3">{row.party || '—'}</td>
                      <td className="px-4 py-3 min-w-[260px]">{row.subject || '—'}</td>
                      <td className="px-4 py-3">{row.fileNo || '—'}</td>
                      <td className="px-4 py-3">{row.reference || '—'}</td>
                      <td className="px-4 py-3">{row.source}</td>
                      <td className="px-4 py-3">{row.attachments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <strong>Report safety:</strong> reports are generated from the records you can already view in Firestore. Downloading a report does not modify, delete, or re-register any letter.
          {isAdmin ? ' Administrator accounts can export all registered records available to this register.' : ''}
        </div>
      </main>
    </div>
  );
}
