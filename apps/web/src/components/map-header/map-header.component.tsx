import { Box, Card, Heading, Text } from '@radix-ui/themes';
import { gsap } from 'gsap';
import Image from 'next/image';
import { type ReactNode, useRef } from 'react';

import { useGsapMotion } from '@/integrations/gsap/motion';

type MapHeaderProps = {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
};

export function MapHeader({ eyebrow, title, children }: MapHeaderProps) {
  const ref = useRef<HTMLElement>(null);

  useGsapMotion(() => {
    gsap.fromTo(
      ref.current,
      { autoAlpha: 0, y: 28 },
      { autoAlpha: 1, y: 0, duration: 0.85, ease: 'power3.out' },
    );
  }, ref);

  return (
    <Card
      asChild
      className="border-highlight/15 relative mb-8 overflow-hidden rounded-3xl border bg-transparent p-0 shadow-none"
    >
      <header ref={ref}>
        <Box className="absolute inset-0 -z-20">
          <Image
            src="/landing/map/map-1024.webp"
            alt=""
            aria-hidden="true"
            fill
            sizes="(max-width: 768px) 100vw, 896px"
            className="object-cover opacity-35"
            priority
          />
        </Box>
        <Box
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(90%_80%_at_50%_20%,--alpha(var(--color-highlight)/12%)_0%,--alpha(var(--color-deep)/55%)_45%,--alpha(var(--color-deep)/95%)_100%)]"
        />
        <Box className="landing-grain -z-10" aria-hidden="true" />

        <Box className="relative px-6 py-10 md:px-10 md:py-12">
          {eyebrow ? (
            <Text
              as="p"
              size="1"
              className="font-road-captain text-highlight/70 mb-3 tracking-[0.35em] uppercase"
            >
              {eyebrow}
            </Text>
          ) : null}
          <Heading
            as="h1"
            className="font-one-piece text-highlight title-glow text-[clamp(2rem,6vw,3.5rem)] leading-[0.95] tracking-wide"
          >
            {title}
          </Heading>
          {children}
        </Box>
      </header>
    </Card>
  );
}
