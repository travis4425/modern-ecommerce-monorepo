import { useTranslation } from 'react-i18next';
import { Container } from '../ui/Container';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-line bg-surface">
      <Container className="flex flex-col gap-1 py-6 text-sm text-ink-subtle sm:flex-row sm:items-center sm:justify-between">
        <span className="font-semibold text-ink-muted">{t('common.appName')}</span>
        <span>{t('common.tagline')}</span>
      </Container>
    </footer>
  );
}
