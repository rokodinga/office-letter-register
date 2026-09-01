import { Link } from 'react-router-dom';
import {
  ArrowRight,
  FileSpreadsheet,
  Inbox,
  ShieldCheck,
  Sparkles,
  Search,
  FileText,
  LockKeyhole,
  ChevronRight,
} from 'lucide-react';

const ODISHA_EMBLEM = 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Seal_of_Odisha.png';

export function HomePage() {
  return (
    <div className="home-page min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      <div className="home-orb home-orb-one" aria-hidden="true" />
      <div className="home-orb home-orb-two" aria-hidden="true" />

      <header className="home-header sticky top-0 z-50 border-b border-white/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-3.5 sm:px-6">
          <Link to="/" className="group flex min-w-0 items-center gap-3.5" aria-label="Forest Range Office Kodinga home">
            <div className="home-emblem-wrap flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-white shadow-sm">
              <img
                src={ODISHA_EMBLEM}
                alt="Government of Odisha emblem"
                className="h-10 w-10 object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold leading-tight text-blue-950 sm:text-base">
                Forest, Environment &amp; Climate Change Department
              </div>
              <div className="text-xs font-semibold text-slate-500 sm:text-sm">
                Govt of Odisha · Forest Range Office, Kodinga
              </div>
            </div>
          </Link>

          <Link
            to="/login"
            className="home-button-primary hidden shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white sm:inline-flex"
          >
            Sign In <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      <main className="relative">
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-12 sm:px-6 md:pb-24 md:pt-16 lg:grid-cols-[1.08fr_.92fr] lg:gap-16">
          <div className="relative z-10">
            <div className="home-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.12em] text-blue-700 shadow-sm backdrop-blur">
              <Sparkles size={14} />
              Office Correspondence Management
            </div>

            <h1 className="home-fade-up home-delay-1 max-w-4xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl md:text-6xl md:leading-[1.04]">
              Office Letter Register
              <span className="mt-3 block bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 bg-clip-text text-transparent">
                simple, secure &amp; organised.
              </span>
            </h1>

            <p className="home-fade-up home-delay-2 mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              A secure digital register for authorised office personnel to record Incoming Dak
              and Outgoing Letters, find correspondence quickly, manage supporting documents,
              and generate official reports.
            </p>

            <div className="home-fade-up home-delay-3 mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="home-button-primary inline-flex items-center gap-2 rounded-xl px-5 py-3.5 font-bold text-white shadow-lg shadow-blue-600/20"
              >
                Sign in to the register <ArrowRight size={18} />
              </Link>
              <Link
                to="/signup"
                className="home-button-secondary inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 font-bold text-slate-800 shadow-sm"
              >
                Create an account
              </Link>
            </div>

            <div className="home-fade-up home-delay-4 mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold text-slate-500">
              <span className="inline-flex items-center gap-2">
                <span className="home-status-dot" />
                Secure access
              </span>
              <span className="inline-flex items-center gap-2">
                <LockKeyhole size={16} className="text-blue-600" />
                Controlled administration
              </span>
              <span className="inline-flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-blue-600" />
                PDF &amp; Excel reports
              </span>
            </div>
          </div>

          <div className="home-fade-up home-delay-2 relative z-10">
            <div className="home-dashboard-card relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-2xl shadow-blue-950/10 backdrop-blur-xl sm:p-6">
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-100/70 blur-2xl" />
              <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-indigo-100/60 blur-3xl" />

              <div className="relative">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Digital Register</p>
                    <h2 className="mt-1 text-xl font-extrabold text-slate-950">Today at a glance</h2>
                  </div>
                  <div className="home-pulse flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <FileText size={21} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="home-mini-card rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
                    <div className="flex items-center justify-between">
                      <Inbox size={19} className="text-blue-700" />
                      <span className="text-2xl font-black text-slate-950">01</span>
                    </div>
                    <p className="mt-4 text-sm font-bold text-slate-800">Incoming Dak</p>
                    <p className="mt-1 text-xs text-slate-500">Received correspondence</p>
                  </div>
                  <div className="home-mini-card rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
                    <div className="flex items-center justify-between">
                      <ArrowRight size={19} className="rotate-[-45deg] text-emerald-700" />
                      <span className="text-2xl font-black text-slate-950">00</span>
                    </div>
                    <p className="mt-4 text-sm font-bold text-slate-800">Outgoing Letters</p>
                    <p className="mt-1 text-xs text-slate-500">Dispatched correspondence</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
                      <Search size={19} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">Search correspondence</p>
                      <p className="text-xs text-slate-500">Find records in seconds</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-400" />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                  <ShieldCheck size={21} className="shrink-0 text-blue-700" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">Controlled office access</p>
                    <p className="text-xs text-slate-500">Designed for authorised personnel</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200/80 bg-white/75">
          <div className="mx-auto grid max-w-7xl gap-px px-5 sm:px-6 md:grid-cols-3">
            <div className="home-feature group border-slate-200 py-8 md:border-r md:pr-8">
              <div className="flex items-start gap-4">
                <div className="home-icon-box rounded-2xl bg-blue-50 p-3 text-blue-700">
                  <Inbox size={23} />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-950">Incoming &amp; Outgoing</h2>
                  <p className="mt-1.5 text-sm leading-6 text-slate-500">
                    Maintain searchable office correspondence registers with controlled administrative access.
                  </p>
                </div>
              </div>
            </div>

            <div className="home-feature group border-slate-200 py-8 md:border-r md:px-8">
              <div className="flex items-start gap-4">
                <div className="home-icon-box rounded-2xl bg-indigo-50 p-3 text-indigo-700">
                  <FileSpreadsheet size={23} />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-950">Reports &amp; Records</h2>
                  <p className="mt-1.5 text-sm leading-6 text-slate-500">
                    Filter register records and generate clean PDF or Excel reports when required.
                  </p>
                </div>
              </div>
            </div>

            <div className="home-feature group py-8 md:pl-8">
              <div className="flex items-start gap-4">
                <div className="home-icon-box rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                  <ShieldCheck size={23} />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-950">Controlled Gmail Review</h2>
                  <p className="mt-1.5 text-sm leading-6 text-slate-500">
                    Authorised administrators can review configured official Gmail correspondence before registration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 md:py-20">
          <div className="home-cta relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-10 text-white shadow-2xl shadow-slate-950/15 sm:px-10 md:flex md:items-center md:justify-between md:gap-8 md:px-12">
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-blue-600/30 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="relative">
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-blue-300">Ready when you are</p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">Keep your office correspondence organised.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Sign in to continue managing the register or create an account if you are an authorised user.
              </p>
            </div>
            <div className="relative mt-6 flex shrink-0 flex-wrap gap-3 md:mt-0">
              <Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-blue-50">
                Sign In <ArrowRight size={17} />
              </Link>
              <Link to="/signup" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15">
                Create account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/80">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-7 text-sm sm:px-6 md:flex-row">
          <div className="flex items-center gap-3 text-slate-500">
            <img src={ODISHA_EMBLEM} alt="" className="h-8 w-8 object-contain" aria-hidden="true" />
            <span>Forest Range Office, Kodinga · Govt of Odisha</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-5 font-semibold text-blue-700" aria-label="Footer navigation">
            <Link to="/privacy" className="transition hover:text-blue-950">Privacy Policy</Link>
            <Link to="/terms" className="transition hover:text-blue-950">Terms of Service</Link>
            <Link to="/login" className="transition hover:text-blue-950">Sign In</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
