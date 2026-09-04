import { useTranslation } from 'react-i18next';
import { Container } from '../components/ui/Container';
import { ButtonLink } from '../components/ui/Button';

const FEATURES = [
  { titleKey: 'home.featureRouterTitle', bodyKey: 'home.featureRouterBody' },
  { titleKey: 'home.featureTokensTitle', bodyKey: 'home.featureTokensBody' },
  { titleKey: 'home.featureI18nTitle', bodyKey: 'home.featureI18nBody' },
  { titleKey: 'home.featureQueryTitle', bodyKey: 'home.featureQueryBody' },
] as const;

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <>
      <Container className="py-16 sm:py-24">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
          {t('home.eyebrow')}
        </p>
        <h1 className="mt-2 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          {t('home.title')}
        </h1>
        <p className="mt-4 max-w-xl text-lg text-ink-muted">{t('home.subtitle')}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink to="/system">{t('home.ctaPrimary')}</ButtonLink>
          <ButtonLink to="/api/docs" variant="secondary" external>
            {t('home.ctaSecondary')}
          </ButtonLink>
        </div>
      </Container>

      <section className="border-t border-line bg-surface">
        <Container className="py-14">
          <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-ink-subtle">
            {t('home.featuresTitle')}
          </h2>

          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <li
                key={feature.titleKey}
                className="rounded-card border border-line bg-ground/60 p-5 shadow-card"
              >
                <h3 className="font-semibold">{t(feature.titleKey)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                  {t(feature.bodyKey)}
                </p>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}
