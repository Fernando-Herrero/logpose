import { Box, Button, Flex, IconButton, Tooltip } from '@radix-ui/themes';
import Link from 'next/link';
import { useTranslation } from 'next-i18next/pages';

import { Icon } from '@/components/icons/icon';
import { useAuthSession } from '@/features/auth/api/use-auth';
import {
  type DashboardNavItem,
  getDashboardNavItems,
} from '@/features/dashboard/dashboard-navigation';

type DashboardNavRailProps = {
  activeTab: string;
  onToggleExpanded: () => void;
};

export function DashboardNavRail({
  activeTab,
  onToggleExpanded,
}: DashboardNavRailProps) {
  const { t } = useTranslation();
  const { isAdmin } = useAuthSession();
  const navItems = getDashboardNavItems(isAdmin);

  return (
    <div className="border-highlight/15 bg-deep text-foreground flex h-full w-14 shrink-0 flex-col border-r">
      <Flex
        align="center"
        justify="center"
        className="border-highlight/15 h-14 shrink-0 border-b"
      >
        <Link
          href="/dashboard"
          className="font-one-piece text-highlight hover:text-highlight text-lg no-underline"
        >
          LP
        </Link>
      </Flex>

      <nav aria-label={t('dashboard.nav.label')} className="flex-1">
        <ul className="m-0 flex list-none flex-col items-center gap-2 px-2 py-6">
          {navItems.map(item => (
            <li key={item.id}>
              <NavRailLink item={item} active={activeTab === item.id} />
            </li>
          ))}
        </ul>
      </nav>

      <Box
        px="2"
        py="3"
        className="border-highlight/15 flex flex-col items-center gap-2 border-t"
      >
        <Tooltip side="right" content={t('dashboard.nav.expand')}>
          <IconButton
            type="button"
            variant="ghost"
            color="orange"
            highContrast
            className="m-0! box-border size-9 p-0 text-lg"
            aria-label={t('dashboard.nav.expand')}
            onClick={onToggleExpanded}
          >
            <Icon.CaretRight />
          </IconButton>
        </Tooltip>
      </Box>
    </div>
  );
}

function NavRailLink({
  item,
  active,
}: {
  item: DashboardNavItem;
  active: boolean;
}) {
  const { t } = useTranslation();
  const NavIcon = Icon[item.icon];

  return (
    <Tooltip side="right" content={t(item.labelKey)}>
      <Button
        asChild
        variant={active ? 'soft' : 'ghost'}
        color={active ? 'orange' : 'gray'}
        highContrast={active}
        className="m-0! box-border size-9 p-0"
        aria-label={t(item.labelKey)}
      >
        <Link href={item.href} aria-current={active ? 'page' : undefined}>
          <NavIcon />
        </Link>
      </Button>
    </Tooltip>
  );
}
