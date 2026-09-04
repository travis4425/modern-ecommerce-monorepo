import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Container } from '../ui/Container';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';

const LINKS = [
  { to: '/', labelKey: 'nav.home' },
  { to: '/system', labelKey: 'nav.system' },
] as const;

export function Header() {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface/85 backdrop-blur">
      <Container className="flex h-14 items-center gap-6">
        <NavLink to="/" className="text-base font-bold tracking-tight text-ink">
          {t('common.appName')}
        </NavLink>

        <nav aria-label={t('nav.home')} className="flex items-center gap-1">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              // `end` để liên kết '/' không sáng trên mọi trang con — nếu không,
              // NavLink coi '/' là tiền tố của mọi đường dẫn.
              end={link.to === '/'}
              className={({ isActive }) =>
                `rounded-control px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-muted hover:text-brand-600'
                }`
              }
            >
              {t(link.labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto">
          <LanguageSwitcher />
        </div>
      </Container>
    </header>
  );
}
