import { Flex, Link as RadixLink, Separator, Text } from '@radix-ui/themes';
import Link from 'next/link';
import { useTranslation } from 'next-i18next/pages';

import { LandingLocaleToggleComponent } from '@/features/landing/ui/landing-locale-toggle.component';

const FOOTER_LINKS = [
  ['/#features', 'landing.nav.features'],
  ['/history', 'landing.nav.history'],
  ['/characters', 'landing.nav.characters'],
  ['/map', 'landing.nav.map'],
  ['/faq', 'landing.nav.faq'],
  ['/contact', 'landing.nav.contact'],
  ['/login', 'landing.nav.sign_in'],
  ['/register', 'landing.nav.sign_up'],
] as const;

export function LandingFooterComponent() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-trim/30 bg-deep relative z-10 border-t px-6 py-8">
      <Flex
        direction="column"
        align="center"
        gap="4"
        className="mx-auto max-w-3xl text-center"
      >
        <nav aria-label={t('landing.footer.nav_label')}>
          <ul className="font-road-captain m-0 flex list-none flex-wrap justify-center gap-5 p-0 text-sm tracking-[0.15em] uppercase">
            {FOOTER_LINKS.map(([href, labelKey]) => (
              <li key={href}>
                <RadixLink asChild color="gray" highContrast>
                  <Link href={href}>{t(labelKey)}</Link>
                </RadixLink>
              </li>
            ))}
          </ul>
        </nav>
        <LandingLocaleToggleComponent />
        <Separator size="4" className="w-full max-w-xs bg-white/10" />
        <Text as="p" size="1" color="gray" className="leading-relaxed">
          {t('landing.footer.disclaimer')}
        </Text>
        <Text as="p" size="1" color="gray" className="opacity-70">
          &copy; {year} {t('landing.footer.copyright')}
        </Text>
      </Flex>
    </footer>
  );
}
