import { Flex } from '@radix-ui/themes';
import { gsap } from 'gsap';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';

import { LandingDesktopNav } from '@/features/landing/ui/landing-desktop-nav.component';
import { LandingLocaleToggleComponent } from '@/features/landing/ui/landing-locale-toggle.component';
import {
  LandingMenuToggleButton,
  LandingMobileMenuPanel,
} from '@/features/landing/ui/landing-mobile-menu.component';
import { isMotionDisabled } from '@/integrations/gsap/motion';

let headerIntroPlayed = false;

export function LandingHeaderComponent() {
  const router = useRouter();
  const headerRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isHome = router.pathname === '/';
  const solidHeader = menuOpen || scrolled || !isHome;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => {
      if (mq.matches) setMenuOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (isMotionDisabled() || !headerRef.current) return;

    if (headerIntroPlayed) {
      gsap.set(headerRef.current, { autoAlpha: 1, y: 0 });
      return;
    }

    headerIntroPlayed = true;
    gsap.fromTo(
      headerRef.current,
      { autoAlpha: 0, y: -20 },
      { autoAlpha: 1, y: 0, duration: 0.8, delay: 0.15, ease: 'power3.out' },
    );
  }, []);

  return (
    <>
      <header
        ref={headerRef}
        className={`fixed inset-x-0 top-0 z-50 py-3 transition-all duration-500 max-md:pt-[max(0.75rem,env(safe-area-inset-top))] ${
          solidHeader
            ? 'bg-deep/90 border-b border-white/10 backdrop-blur-md'
            : 'bg-transparent md:py-6'
        }`}
      >
        <Flex
          align="center"
          justify="between"
          gap="4"
          px="5"
          className="mx-auto max-w-6xl md:px-8"
        >
          <Link
            href="/"
            className="shrink-0 transition-opacity hover:opacity-90"
          >
            <Image
              src="/landing/one-piece-logo.webp"
              alt="One Piece LogPose"
              width={80}
              height={40}
              className="h-9 w-auto md:h-10"
              style={{ width: 'auto', height: 'auto' }}
              priority
            />
          </Link>

          <LandingDesktopNav />

          <Flex
            align="center"
            gap="2"
            display={{ initial: 'flex', md: 'none' }}
            className="shrink-0"
          >
            <LandingLocaleToggleComponent compactLabel />
            <LandingMenuToggleButton
              open={menuOpen}
              onToggle={() => setMenuOpen(open => !open)}
            />
          </Flex>
        </Flex>
      </header>

      <LandingMobileMenuPanel
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
    </>
  );
}
