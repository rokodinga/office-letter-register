import { ShieldCheck } from 'lucide-react';

export function OfficeHeader({ className = '' }: { className?: string }) {
  return (
    <header className={className}>
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/95 shadow-2xl backdrop-blur">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500" />
        <div className="flex flex-col items-center gap-4 px-5 py-5 sm:flex-row sm:gap-5 sm:px-7 sm:py-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
            <ShieldCheck size={34} />
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">
              Private Internal Office Utility
            </div>
            <h1 className="text-xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-2xl lg:text-[28px]">
              Office Letter Register
            </h1>
            <p className="mt-1.5 text-sm font-semibold text-slate-600 sm:text-base">
              Kodinga Forest Range · Internal correspondence management
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Privately hosted administrative application. Not a public Government of Odisha website.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
