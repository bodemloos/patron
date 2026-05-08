import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { TRANSLATIONS, SUPPORTED_LANGS, DEFAULT_LANG } from './messages.js';

/**
 * Tiny in-house i18n. No runtime dependency — just a Context that
 * exposes `lang`, `setLang`, and `t(key, vars?)`. Translations live
 * in ./messages.js as flat key → string maps per language. Missing
 * keys fall back to the English string (or the key itself as a last
 * resort) so the app keeps working while strings get translated.
 *
 * Belgium-first: Dutch is the default, with French + English as the
 * other supported choices.
 */
const LANG_KEY = 'patron.lang';

function readInitialLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
  } catch {
    /* ignore */
  }
  // Even when the user prefers French/English in their browser, default
  // to Dutch — that's what the operator (Belgian horeca) wants on a
  // fresh install. Browser language only kicks in if it's NL.
  if (typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().startsWith('nl')) {
    return 'nl';
  }
  return DEFAULT_LANG;
}

const LangContext = createContext({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readInitialLang);

  useEffect(() => {
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', lang);
    }
  }, [lang]);

  const setLang = (next) => {
    if (!SUPPORTED_LANGS.includes(next)) return;
    setLangState(next);
  };

  const t = useMemo(() => {
    const dict = TRANSLATIONS[lang] || {};
    const fallback = TRANSLATIONS.en || {};
    return (key, vars) => {
      let s = dict[key];
      if (s === undefined) s = fallback[key];
      if (s === undefined) s = key;
      if (vars && typeof s === 'string') {
        for (const v in vars) {
          s = s.replace(new RegExp(`\\{${v}\\}`, 'g'), String(vars[v]));
        }
      }
      return s;
    };
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useT() {
  return useContext(LangContext);
}

export { SUPPORTED_LANGS, DEFAULT_LANG };
