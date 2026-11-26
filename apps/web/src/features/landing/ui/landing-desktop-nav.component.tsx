import { Button, DropdownMenu, Flex } from '@radix-ui/themes';
import Link from 'next/link';
import { useTranslation } from 'next-i18next/pages';

import { LandingLocaleToggleComponent } from '@/features/landing/ui/landing-locale-toggle.component';

const NAV_LINK_CLASS =
  '-m-0.5 relative inline-flex shrink-0 cursor-pointer items-center px-1 py-1.5 font-road-captain font-bold text-sm uppercase tracking-[0.12em] text-foreground/85 transition-colors hover:text-highlight after:absolute after:inset-x-1 after:bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-highlight/70 after:transition-transform after:duration-300 hover:after:scale-x-100';

export function LandingDesktopNav() {
  const { t } = useTranslation();

  return (
    <Flex
      asChild
      align="center"
      gap="4"
      display={{ initial: 'none', md: 'flex' }}
      className="shrink-0"
    >
      <nav aria-label={t('landing.nav.label')}>
        <Link href="/#features" className={NAV_LINK_CLASS}>
          {t('landing.nav.features')}
        </Link>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button
              type="button"
              variant="ghost"
              highContrast
              className={NAV_LINK_CLASS}
            >
              {t('landing.nav.onepiece')}
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item asChild>
              <Link href="/history">{t('landing.nav.history')}</Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link href="/characters">{t('landing.nav.characters')}</Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link href="/map">{t('landing.nav.map')}</Link>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button
              type="button"
              variant="ghost"
              highContrast
              className={NAV_LINK_CLASS}
            >
              {t('landing.nav.help')}
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item asChild>
              <Link href="/faq">{t('landing.nav.faq')}</Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link href="/contact">{t('landing.nav.contact')}</Link>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>

        <LandingLocaleToggleComponent compactLabel />
        <Button
          variant="outline"
          highContrast
          size="2"
          radius="full"
          className="m-0! shrink-0"
          asChild
        >
          <Link href="/login">{t('landing.nav.sign_in')}</Link>
        </Button>
        <Button
          color="orange"
          size="2"
          radius="full"
          className="m-0! shrink-0 shadow-[0_0_24px_--alpha(var(--color-highlight)/35%)] transition-shadow duration-300 hover:shadow-[0_0_40px_--alpha(var(--color-highlight)/55%)]"
          asChild
        >
          <Link href="/register">{t('landing.nav.sign_up')}</Link>
        </Button>
      </nav>
    </Flex>
  );
}
