import { Button, Flex, IconButton, Text } from '@radix-ui/themes';
import Link from 'next/link';
import { useTranslation } from 'next-i18next/pages';

import { Icon } from '@/components/icons/icon';
import { useAuthSession } from '@/features/auth/api/use-auth';
import {
  type DashboardNavItem,
  getDashboardNavItems,
} from '@/features/dashboard/dashboard-navigation';

type DashboardNavSidebarProps = {
  activeTab: string;
  onToggleExpanded: () => void;
};

export function DashboardNavSidebar({
  activeTab,
  onToggleExpanded,
}: DashboardNavSidebarProps) {
  const { t } = useTranslation();
  const { isAdmin } = useAuthSession();
  const navItems = getDashboardNavItems(isAdmin);

  return (
    <div className="border-highlight/15 bg-deep text-foreground flex h-full w-55 shrink-0 flex-col border-r">
      <Flex
        align="center"
        px="4"
        className="border-highlight/15 h-14 shrink-0 border-b"
      >
        <Link
          href="/dashboard"
          className="font-one-piece text-highlight hover:text-highlight text-lg no-underline"
        >
          LOGPOSE
        </Link>
      </Flex>

      <nav aria-label={t('dashboard.nav.label')} className="flex-1">
        <ul className="m-0 flex list-none flex-col gap-2 px-3 py-4">
          {navItems.map(item => (
            <li key={item.id}>
              <NavSidebarLink item={item} active={activeTab === item.id} />
            </li>
          ))}
        </ul>
      </nav>

      <Flex
        direction="column"
        gap="2"
        px="3"
        py="3"
        className="border-highlight/15 border-t"
      >
        <Flex justify="end">
          <IconButton
            type="button"
            variant="ghost"
            color="orange"
            highContrast
            className="m-0!"
            aria-label={t('dashboard.nav.collapse')}
            onClick={onToggleExpanded}
          >
            <Icon.CaretLeft />
          </IconButton>
        </Flex>
      </Flex>
    </div>
  );
}

function NavSidebarLink({
  item,
  active,
}: {
  item: DashboardNavItem;
  active: boolean;
}) {
  const { t } = useTranslation();
  const NavIcon = Icon[item.icon];

  return (
    <Button
      asChild
      variant={active ? 'soft' : 'ghost'}
      color={active ? 'orange' : 'gray'}
      highContrast={active}
      className="box-border h-auto w-full justify-start gap-3 px-3 py-2"
    >
      <Link href={item.href} aria-current={active ? 'page' : undefined}>
        <NavIcon />
        <Text as="span" size="2" weight="medium">
          {t(item.labelKey)}
        </Text>
      </Link>
    </Button>
  );
}
