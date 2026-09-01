import { ShieldCheck } from 'lucide-react';

const ODISHA_EMBLEM_URL = 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Seal_of_Odisha.png';

export function OfficeHeader({ className = '' }: { className?: string }) {
  return (
    <header className={`w-full ${className}`}>
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/95 shadow-2xl backdrop-blur">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-white to-emerald-500" />
        <div className="flex flex-col items-center gap-4 px-5 py-5 sm:flex-row sm:gap-5 sm:px-7 sm:py-6">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-md">
            <img
              src={ODISHA_EMBLEM_URL}
              alt="Government of Odisha emblem"
              className="h-full w-full object-contain"
            />
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">
              <ShieldCheck size={12} />
              Official Office Portal
            </div>
            <h1 className="text-xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-2xl lg:text-[28px]">
              Forest, Environment &amp; Climate Change Department
              <span className="block text-blue-800">Govt of Odisha</span>
            </h1>
            <p className="mt-1.5 text-sm font-semibold text-slate-600 sm:text-base">
              Forest Range Office, Kodinga
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
