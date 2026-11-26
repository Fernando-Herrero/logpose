import type { IconProps } from '@phosphor-icons/react';
import {
  BellIcon,
  BookmarkSimpleIcon,
  BookOpenIcon,
  CardsIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ChatCircleIcon,
  ChatsCircleIcon,
  ClockIcon,
  CompassIcon,
  CurrencyCircleDollarIcon,
  GearSixIcon,
  HeartIcon,
  LockKeyIcon,
  MagnifyingGlassIcon,
  RepeatIcon,
  SealCheckIcon,
  ShieldCheckIcon,
  ShieldIcon,
  SignOutIcon,
  StarIcon,
  TelevisionIcon,
  UserIcon,
  WheelchairIcon,
} from '@phosphor-icons/react';

export const Icon = {
  CaretDown: (p: IconProps) => (
    <CaretDownIcon size={14} weight="bold" aria-hidden {...p} />
  ),
  CaretLeft: (p: IconProps) => (
    <CaretLeftIcon size={14} weight="bold" aria-hidden {...p} />
  ),
  CaretRight: (p: IconProps) => (
    <CaretRightIcon size={14} weight="bold" aria-hidden {...p} />
  ),
  User: (p: IconProps) => <UserIcon size={18} aria-hidden {...p} />,
  Community: (p: IconProps) => <ChatsCircleIcon size={18} aria-hidden {...p} />,
  Serie: (p: IconProps) => <TelevisionIcon size={18} aria-hidden {...p} />,
  Cards: (p: IconProps) => <CardsIcon size={18} aria-hidden {...p} />,
  Search: (p: IconProps) => (
    <MagnifyingGlassIcon size={18} aria-hidden {...p} />
  ),
  Bell: (p: IconProps) => <BellIcon size={18} aria-hidden {...p} />,
  Settings: (p: IconProps) => <GearSixIcon size={18} aria-hidden {...p} />,
  Admin: (p: IconProps) => <ShieldIcon size={18} aria-hidden {...p} />,
  Heart: (p: IconProps) => <HeartIcon size={16} aria-hidden {...p} />,
  HeartFill: (p: IconProps) => (
    <HeartIcon size={16} weight="fill" aria-hidden {...p} />
  ),
  Bookmark: (p: IconProps) => (
    <BookmarkSimpleIcon size={16} aria-hidden {...p} />
  ),
  BookmarkFill: (p: IconProps) => (
    <BookmarkSimpleIcon size={16} weight="fill" aria-hidden {...p} />
  ),
  Comment: (p: IconProps) => <ChatCircleIcon size={16} aria-hidden {...p} />,
  Repeat: (p: IconProps) => <RepeatIcon size={16} aria-hidden {...p} />,
  RepeatFill: (p: IconProps) => (
    <RepeatIcon size={16} weight="fill" aria-hidden {...p} />
  ),
  /** El grosor lo decide quien lo use: relleno = verificado. */
  Badge: (p: IconProps) => <SealCheckIcon size={16} aria-hidden {...p} />,
  Lock: (p: IconProps) => (
    <LockKeyIcon size={22} weight="duotone" aria-hidden {...p} />
  ),
  Monetisation: (p: IconProps) => (
    <CurrencyCircleDollarIcon size={22} weight="duotone" aria-hidden {...p} />
  ),
  Star: (p: IconProps) => (
    <StarIcon size={22} weight="duotone" aria-hidden {...p} />
  ),
  Clock: (p: IconProps) => (
    <ClockIcon size={22} weight="duotone" aria-hidden {...p} />
  ),
  ShieldCheck: (p: IconProps) => (
    <ShieldCheckIcon size={22} weight="duotone" aria-hidden {...p} />
  ),
  Accessibility: (p: IconProps) => (
    <WheelchairIcon size={22} weight="duotone" aria-hidden {...p} />
  ),
  BookOpen: (p: IconProps) => (
    <BookOpenIcon size={22} weight="duotone" aria-hidden {...p} />
  ),
  SignOut: (p: IconProps) => <SignOutIcon size={16} aria-hidden {...p} />,
  Home: (p: IconProps) => <CompassIcon size={18} aria-hidden {...p} />,
} as const;

export type DashboardNavIcon = keyof Pick<
  typeof Icon,
  | 'User'
  | 'Community'
  | 'Serie'
  | 'Cards'
  | 'Search'
  | 'Bell'
  | 'Settings'
  | 'Admin'
  | 'Home'
>;
