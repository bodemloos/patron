import { useStore, ROLES } from '../store.js';
import Logo from './Logo.jsx';

export default function Header() {
  const { role, setRole } = useStore();
  return (
    <header className="h-14 bg-white dark:bg-surface-900 border-b border-slate-200 dark:border-white/5 px-3 sm:px-6 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {/* Compact brand on mobile (sidebar is hidden < md) */}
        <div className="md:hidden flex items-center gap-2 min-w-0">
          <Logo size={22} className="text-brand-600 dark:text-brand-400" />
          <span className="font-semibold truncate">Patron</span>
        </div>
        <div className="hidden md:block text-sm text-slate-500 dark:text-slate-400">
          <span className="text-slate-700 dark:text-slate-200 font-medium">Patron</span> · {new Date().toLocaleDateString()}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400">View as</span>
        <div className="flex bg-slate-100 dark:bg-surface-850 rounded-lg p-1 text-xs font-medium">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={[
                'px-2.5 sm:px-3 py-1 rounded-md capitalize transition',
                role === r ? 'bg-white dark:bg-surface-900 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400',
              ].join(' ')}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
