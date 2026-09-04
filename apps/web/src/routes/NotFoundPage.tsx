import { useTranslation } from 'react-i18next';
import { Container } from '../components/ui/Container';
import { ButtonLink } from '../components/ui/Button';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <Container className="flex flex-col items-center py-24 text-center">
      <p className="font-mono text-5xl font-bold text-brand-200">{t('notFound.code')}</p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">{t('notFound.title')}</h1>
      <p className="mt-2 max-w-md text-ink-muted">{t('notFound.body')}</p>
      <ButtonLink to="/" className="mt-7">
        {t('notFound.back')}
      </ButtonLink>
    </Container>
  );
}
