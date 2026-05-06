import { useT, SUPPORTED_LANGS } from '../i18n/index.jsx';
import { LANG_LABELS } from '../i18n/messages.js';

/**
 * Compact NL/FR/EN segmented control. Sits in the app header next
 * to the role switcher and persists the choice via localStorage
 * (handled inside the LanguageProvider).
 */
export default function LanguageSwitcher() {
  const { lang, setLang, t } = useT();
  return (
    <div className="flex items-center gap-1.5">
      <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400">
        {t('header.lang.label')}
      </span>
      <div className="flex bg-slate-100 dark:bg-surface-850 rounded-lg p-1 text-xs font-medium">
        {SUPPORTED_LANGS.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            className={[
              'px-2 sm:px-2.5 py-1 rounded-md transition',
              lang === code
                ? 'bg-white dark:bg-surface-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400',
            ].join(' ')}
            aria-pressed={lang === code}
          >
            {LANG_LABELS[code] || code.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
