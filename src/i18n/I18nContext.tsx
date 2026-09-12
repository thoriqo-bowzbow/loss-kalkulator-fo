import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { id, type I18nKey } from './id';
import { en } from './en';

export type Lang = 'id' | 'en';

const DICTS = { id, en } as const;

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: I18nKey) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

const STORAGE_KEY = 'lk2.lang';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'en' ? 'en' : 'id';
  });

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  const t = useCallback((key: I18nKey) => DICTS[lang][key], [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
