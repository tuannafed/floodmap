import { useI18n } from '@/lib/i18n/context';

export function LangToggle() {
  const { lang, setLang, s } = useI18n();
  const toggle = () => setLang(lang === 'en' ? 'vi' : 'en');

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={s.lang.switchTo}
      title={s.lang.switchTo}
      className="h-8 min-w-8 px-2 rounded-md brand-tile flex items-center justify-center transition-colors text-[11px] cursor-pointer font-bold uppercase tracking-wide"
      style={{ color: 'var(--primary)' }}
    >
      {lang.toUpperCase()}
    </button>
  );
}
