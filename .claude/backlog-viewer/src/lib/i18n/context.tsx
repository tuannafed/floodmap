import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DICTS,
  type Dict,
  DOMAIN_LABELS_VI,
  type Lang,
  STAGE_LABELS_VI,
  STATUS_LABELS_VI,
} from './dict';

const STORAGE_KEY = 'caw-bv-lang';

function readLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  return window.localStorage.getItem(STORAGE_KEY) === 'vi' ? 'vi' : 'en';
}

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  s: Dict;
  /** Translates a canonical status key (task.status, e.g. "review-pending") — falls back to `fallback` (the English label from statusLabel()) when lang is 'en' or the key is unrecognized. */
  status: (key: string, fallback: string) => string;
  /** Same as `status`, but for a stage key (Stage.key, e.g. "coding"). */
  stage: (key: string, fallback: string) => string;
  /** Same as `status`, but for a skill-domain key (DomainStyle.key, e.g. "engineering"). */
  domain: (key: string, fallback: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => readLang());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore quota / private mode errors
    }
  }, [lang]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);

  const value = useMemo<I18nContextValue>(() => {
    const s = DICTS[lang];
    return {
      lang,
      setLang,
      s,
      status: (key, fallback) => (lang === 'vi' ? (STATUS_LABELS_VI[key] ?? fallback) : fallback),
      stage: (key, fallback) => (lang === 'vi' ? (STAGE_LABELS_VI[key] ?? fallback) : fallback),
      domain: (key, fallback) => (lang === 'vi' ? (DOMAIN_LABELS_VI[key] ?? fallback) : fallback),
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n() must be used within <I18nProvider>');
  return ctx;
}
