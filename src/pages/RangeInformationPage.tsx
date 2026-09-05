import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { BookOpen, ChevronDown, Download, Filter, LogIn, MapPinned, Printer, Search, ShieldCheck, TreePine, Users, X } from 'lucide-react';
import { useAuth } from '../firebase/auth-context';

const EMBLEM = 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Seal_of_Odisha.png';
const DATA = '/api/public/range-information';
const SECTIONS = ['Kodinga', 'Kosagumuda'];
const BEATS = ['Deodongri', 'Dongra', 'Kusumi', 'Palpur', 'Podabasa', 'Rajoda'];
const META: Record<string, string> = {
  RF: 'Reserve Forest', PRF: 'Proposed Reserve Forest', 'Both RF & PRF': 'Forest Blocks', VF: 'Village Forest',
  'All Plantation 1993-till': 'Historical Plantation', 'Plantation 22-23 to 25-26': 'Recent Plantation', 'Land Recovered': 'Land Recovery',
  'Nursery 25-26': 'Nursery 2025-26', 'Nursery 26-27': 'Nursery 2026-27', 'Dist. of Seedlings 20-25': 'Seedling Distribution',
  'Plantation (CAMPA)': 'CAMPA Plantation', 'MGNREGS 20-24': 'MGNREGS', Waterbody: 'Water Bodies', Infra: 'Infrastructure',
  Vss: 'VSS Directory', 'VSS Building 2024-25': 'VSS Buildings', 'AJY Convergency 2024-25': 'AJY Convergence', 'List of Villages': 'Village Directory',
  'FC Act': 'Forest Diversion / FC Act', FRC: 'Forest Rights Claims', 'Fire Point': 'Fire Points', Nursery: 'Nursery Directory',
  SMC: 'Soil & Moisture Conservation', Content: 'Range Contents', 2021: 'Fire Points 2021', 2022: 'Fire Points 2022', 2023: 'Fire Points 2023',
  2024: 'Fire Points 2024', 2025: 'Fire Points 2025',
};

type RecordRow = { source_row: number; fields: Record<string, unknown>; section?: string | null; beat?: string | null; year?: string | null };
type Sheet = { name: string; tables: { headers: string[]; rows: RecordRow[] }[]; record_count: number };
type DataSet = { source_file: string; sheets: Sheet[] };

const text = (value: unknown) => String(value ?? '').trim();
const lower = (value: unknown) => text(value).toLowerCase().replace(/\s+/g, ' ');
const flatten = (sheet: Sheet) => sheet.tables.flatMap(table => table.rows.map(row => ({ ...row, sheet: sheet.name, headers: table.headers })));

async function loadData(): Promise<DataSet> {
  const response = await fetch(DATA, { cache: 'no-store', headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Range data request failed (${response.status}).`);
  const data = await response.json();
  if (!data || !Array.isArray(data.sheets)) throw new Error('Range data response is invalid.');
  return data as DataSet;
}

export function RangeInformationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DataSet | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [section, setSection] = useState('');
  const [beat, setBeat] = useState('');
  const [category, setCategory] = useState('');
  const [year, setYear] = useState('');
  const [open, setOpen] = useState('');
  const [handbookOpen, setHandbookOpen] = useState(false);

  useEffect(() => {
    loadData().then(setData).catch(errorValue => setError(errorValue instanceof Error ? errorValue.message : 'Unable to load Range information.'));
  }, []);

  const allSheets = data?.sheets ?? [];
  const allRecords = useMemo(() => allSheets.flatMap(flatten), [allSheets]);
  const years = useMemo(() => Array.from(new Set(allRecords.map(row => text(row.year)).filter(Boolean))).sort().reverse(), [allRecords]);
  const sheets = useMemo(() => allSheets
    .map(sheet => {
      const rows = flatten(sheet).filter(row => {
        if (section && (!row.section || lower(row.section) !== lower(section))) return false;
        if (beat && (!row.beat || lower(row.beat) !== lower(beat))) return false;
        if (year && (!row.year || text(row.year) !== year)) return false;
        const haystack = Object.values(row.fields).map(text).join(' ').toLowerCase();
        return !query || haystack.includes(query.toLowerCase()) || sheet.name.toLowerCase().includes(query.toLowerCase());
      });
      return { ...sheet, rows };
    })
    .filter(sheet => !category || sheet.name === category)
    .filter(sheet => sheet.rows.length || (!query && !section && !beat && !year)),
    [allSheets, query, section, beat, year, category]
  );
  const records = sheets.reduce((total, sheet) => total + sheet.rows.length, 0);

  const requireUser = (action: string) => {
    if (user) return true;
    if (window.confirm(`${action} is available to registered users. Sign in now?`)) navigate('/login');
    return false;
  };

  const downloadExcel = () => {
    if (!requireUser('Excel export')) return;
    const workbook = XLSX.utils.book_new();
    sheets.forEach(sheet => {
      if (!sheet.rows.length) return;
      const headers = Array.from(new Set(sheet.tables.flatMap(table => table.headers)));
      const rows = [
        ['Source Sheet', 'Source Row', 'Section', 'Beat', 'Year', ...headers],
        ...sheet.rows.map(row => [sheet.name, row.source_row, row.section || '', row.beat || '', row.year || '', ...headers.map(header => row.fields[header] ?? '')]),
      ];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheet.name.slice(0, 31));
    });
    XLSX.writeFile(workbook, `Kodinga-Range-Information-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const printPage = () => { if (requireUser('Printing')) window.print(); };

  const makeHandbook = () => {
    if (!requireUser('Handbook download')) return;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const width = pdf.internal.pageSize.getWidth();
    const height = pdf.internal.pageSize.getHeight();
    let y = 22;
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(20); pdf.text('KODINGA FOREST RANGE', width / 2, y, { align: 'center' });
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(12); pdf.text('Range Information Handbook', width / 2, y + 9, { align: 'center' });
    pdf.setFontSize(9); pdf.text('Forest, Environment & Climate Change Department · Government of Odisha', width / 2, y + 17, { align: 'center' });
    pdf.text(`Source: ${data?.source_file || 'Kodinga Range Information'}`, width / 2, y + 25, { align: 'center' });
    pdf.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, width / 2, y + 32, { align: 'center' });
    y = 62; pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12); pdf.text('Selected scope', 15, y); y += 7;
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.text(`Section: ${section || 'All'}    Beat: ${beat || 'All'}    Year: ${year || 'All'}    Records: ${records}`, 15, y); y += 12;
    sheets.forEach(sheet => {
      if (!sheet.rows.length) return;
      if (y > height - 22) { pdf.addPage(); y = 18; }
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.text(META[sheet.name] || sheet.name, 15, y); y += 5;
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7);
      sheet.rows.forEach(row => {
        const chunks = pdf.splitTextToSize(Object.values(row.fields).map(text).filter(Boolean).join(' | ') || '—', width - 30);
        chunks.forEach(chunk => { if (y > height - 14) { pdf.addPage(); y = 18; } pdf.text(String(chunk).slice(0, 180), 15, y); y += 3.7; });
      });
      y += 5;
    });
    const pages = pdf.getNumberOfPages();
    for (let page = 1; page <= pages; page++) { pdf.setPage(page); pdf.setFontSize(7); pdf.text(`Kodinga Forest Range · Page ${page} of ${pages}`, width / 2, height - 7, { align: 'center' }); }
    pdf.save(`Kodinga-Range-Handbook-${new Date().toISOString().slice(0, 10)}.pdf`);
    setHandbookOpen(false);
  };

  return <div className="min-h-screen bg-slate-50 text-slate-900 print:bg-white">
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur-xl print:static">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-3"><img src={EMBLEM} alt="Government of Odisha emblem" className="h-11 w-11 object-contain"/><div><p className="truncate text-sm font-extrabold text-emerald-950 sm:text-base">Forest, Environment &amp; Climate Change Department</p><p className="truncate text-xs font-semibold text-slate-500 sm:text-sm">Govt of Odisha · Forest Range Office, Kodinga</p></div></Link>
        {user ? <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 sm:inline-flex"><ShieldCheck size={14}/> Registered access</span> : <Link to="/login" className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold"><LogIn size={16}/> Sign in</Link>}
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
      <section className="overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-9 text-white shadow-2xl sm:px-10"><div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-end"><div><span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-200"><TreePine size={14}/> Public information centre</span><h1 className="text-3xl font-black sm:text-5xl">Kodinga Range Information</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">Search and explore the Range's forests, villages, plantations, nurseries, VSS, fire points, infrastructure and conservation records.</p></div><div className="grid grid-cols-3 gap-3"><div className="rounded-2xl border border-white/10 bg-white/10 p-4"><TreePine size={18}/><p className="mt-2 text-2xl font-black">{allSheets.length || 29}</p><p className="text-xs text-slate-300">Information sheets</p></div><div className="rounded-2xl border border-white/10 bg-white/10 p-4"><MapPinned size={18}/><p className="mt-2 text-2xl font-black">2</p><p className="text-xs text-slate-300">Sections</p></div><div className="rounded-2xl border border-white/10 bg-white/10 p-4"><Users size={18}/><p className="mt-2 text-2xl font-black">6</p><p className="text-xs text-slate-300">Beats</p></div></div></div></section>
      <section className="mt-6 rounded-2xl border bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search any Range information..." className="w-full rounded-xl border bg-slate-50 py-3 pl-10 pr-10 text-sm outline-none focus:border-emerald-500"/>{query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={17}/></button>}</div><div className="flex flex-wrap gap-2"><select value={section} onChange={event => { setSection(event.target.value); setBeat(''); }} className="rounded-xl border px-3 py-3 text-sm font-semibold"><option value="">All Sections</option>{SECTIONS.map(value => <option key={value}>{value}</option>)}</select><select value={beat} onChange={event => setBeat(event.target.value)} className="rounded-xl border px-3 py-3 text-sm font-semibold"><option value="">All Beats</option>{BEATS.filter(value => !section || (section === 'Kodinga' ? value !== 'Rajoda' : value === 'Rajoda')).map(value => <option key={value}>{value}</option>)}</select><select value={year} onChange={event => setYear(event.target.value)} className="rounded-xl border px-3 py-3 text-sm font-semibold"><option value="">All Years</option>{years.map(value => <option key={value}>{value}</option>)}</select><select value={category} onChange={event => setCategory(event.target.value)} className="rounded-xl border px-3 py-3 text-sm font-semibold"><option value="">All Information</option>{allSheets.map(sheet => <option key={sheet.name} value={sheet.name}>{META[sheet.name] || sheet.name}</option>)}</select></div></div>{(query || section || beat || year || category) && <div className="mt-3 border-t pt-3 text-xs font-semibold text-slate-500"><Filter size={13} className="mr-1 inline"/>{records} matching records<button onClick={() => { setQuery(''); setSection(''); setBeat(''); setYear(''); setCategory(''); }} className="float-right text-emerald-700">Clear filters</button></div>}</section>
      {error && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><strong>Unable to load Range information.</strong><p className="mt-1">{error}</p></div>}
      {!data && !error && <div className="mt-5 rounded-2xl border bg-white p-5 text-sm font-semibold">Loading the verified Range data…</div>}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Explore the dataset</p><h2 className="mt-1 text-2xl font-black">Information catalogue</h2></div><div className="flex flex-wrap gap-2"><button onClick={downloadExcel} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white"><Download size={17}/> Excel</button><button onClick={() => setHandbookOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-900"><BookOpen size={17}/> Handbook</button><button onClick={printPage} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold"><Printer size={17}/> Print</button></div></div>
      <section className="mt-5 grid gap-4 md:grid-cols-2">{sheets.map(sheet => { const title = META[sheet.name] || sheet.name; const sample = sheet.rows[0]; const headers = Array.from(new Set(sheet.tables.flatMap(table => table.headers))); return <article key={sheet.name} className="overflow-hidden rounded-2xl border bg-white shadow-sm"><button onClick={() => setOpen(open === sheet.name ? '' : sheet.name)} className="flex w-full items-center gap-4 p-5 text-left hover:bg-slate-50"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl">🌿</span><span className="min-w-0 flex-1"><span className="block font-extrabold">{title}</span><span className="mt-1 block text-xs text-slate-500">{sheet.name} · {sheet.rows.length} matching records</span></span><ChevronDown size={18} className={open === sheet.name ? 'rotate-180' : ''}/></button>{open === sheet.name && <div className="border-t p-4"><div className="mb-3 flex flex-wrap gap-2">{headers.slice(0, 7).map(header => <span key={header} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{header}</span>)}</div>{sample && <div className="overflow-auto rounded-xl border"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50"><tr>{headers.slice(0, 8).map(header => <th key={header} className="whitespace-nowrap px-3 py-2 font-bold">{header}</th>)}</tr></thead><tbody><tr>{headers.slice(0, 8).map(header => <td key={header} className="max-w-xs px-3 py-2 align-top">{text(sample.fields[header]) || '—'}</td>)}</tr></tbody></table></div>}<p className="mt-3 text-xs text-slate-500">Excel export includes every matching record plus source sheet and source row.</p></div>}</article>; })}</section>
    </main>
    {handbookOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-5"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-black">Range handbook</h3><p className="mt-1 text-sm text-slate-500">Generate a PDF from the current filters.</p></div><button onClick={() => setHandbookOpen(false)}><X size={20}/></button></div><div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm"><p><strong>Section:</strong> {section || 'All'}</p><p><strong>Beat:</strong> {beat || 'All'}</p><p><strong>Year:</strong> {year || 'All'}</p><p><strong>Category:</strong> {category ? META[category] || category : 'All'}</p><p><strong>Records:</strong> {records}</p></div><div className="mt-5 flex justify-end gap-2"><button onClick={() => setHandbookOpen(false)} className="rounded-xl border px-4 py-2.5 text-sm font-bold">Cancel</button><button onClick={makeHandbook} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white">Generate PDF</button></div></div></div>}
  </div>;
}
