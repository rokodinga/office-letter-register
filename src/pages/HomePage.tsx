import { Link } from 'react-router-dom';
import { ArrowRight, FileSpreadsheet, Inbox, ShieldCheck } from 'lucide-react';

export function HomePage() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="text-2xl font-bold text-blue-900">
            Office Letter Register
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700"
          >
            Sign In <ArrowRight size={17} />
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-14">
        <section className="bg-white rounded-2xl border shadow-sm p-8 md:p-12">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Office correspondence management</p>
            <h1 className="mt-3 text-4xl md:text-5xl font-bold text-slate-900">
              Office Letter Register
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              A secure application for authorized office personnel to maintain Incoming Dak
              and Outgoing Letter Register records, review correspondence, attach supporting
              documents, search records, and generate PDF or Excel reports.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Sign in to the register <ArrowRight size={18} />
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-5 py-3 font-semibold text-blue-800 hover:bg-blue-50"
              >
                Create an account
              </Link>
            </div>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-slate-50 p-5">
              <Inbox className="text-blue-700" size={26} />
              <h2 className="mt-3 font-bold text-slate-900">Incoming & Outgoing</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Maintain searchable office correspondence registers with controlled administrative access.
              </p>
            </div>
            <div className="rounded-xl border bg-slate-50 p-5">
              <FileSpreadsheet className="text-blue-700" size={26} />
              <h2 className="mt-3 font-bold text-slate-900">Reports</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Filter register records and export reports in PDF or Excel format.
              </p>
            </div>
            <div className="rounded-xl border bg-slate-50 p-5">
              <ShieldCheck className="text-blue-700" size={26} />
              <h2 className="mt-3 font-bold text-slate-900">Controlled Gmail review</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Authorized administrators can review configured official Gmail correspondence before registering it as an office record.
              </p>
            </div>
          </div>
        </section>

        <footer className="mt-8 flex flex-wrap justify-center gap-5 text-sm">
          <Link to="/privacy" className="text-blue-700 hover:text-blue-900 font-semibold">Privacy Policy</Link>
          <Link to="/terms" className="text-blue-700 hover:text-blue-900 font-semibold">Terms of Service</Link>
          <Link to="/login" className="text-blue-700 hover:text-blue-900 font-semibold">Sign In</Link>
        </footer>
      </main>
    </div>
  );
}
