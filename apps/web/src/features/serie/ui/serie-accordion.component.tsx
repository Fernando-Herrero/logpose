import { Box, Button, Card, Flex, Heading, Text } from '@radix-ui/themes';
import { type ReactNode, useId } from 'react';

import { Icon } from '@/components/icons/icon';

type SerieAccordionProps = {
  variant: 'saga' | 'arc';
  title: string;
  subtitle?: string;
  meta?: string;
  isOpen: boolean;
  onToggle: () => void;
  dimmed?: boolean;
  children: ReactNode;
};

export function SerieAccordion({
  variant,
  title,
  subtitle,
  meta,
  isOpen,
  onToggle,
  dimmed,
  children,
}: SerieAccordionProps) {
  const isSaga = variant === 'saga';
  const panelId = useId();

  return (
    <Card
      className={
        isSaga
          ? 'faq-item border-highlight/20 rounded-2xl border bg-[linear-gradient(135deg,--alpha(var(--color-highlight)/14%)_0%,--alpha(var(--color-page)/92%)_45%,--alpha(var(--color-deep)/98%)_100%)] p-4 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(0,0,0,0.45)] data-open:shadow-[0_24px_60px_rgba(0,0,0,0.5)]'
          : 'faq-item bg-page/85 rounded-xl border border-white/15 p-3 shadow-md'
      }
      data-open={isOpen || undefined}
    >
      {/* El botón solo envuelve el título, para que el encabezado no lea la descripción; su ::after extiende el clic a toda la cabecera. */}
      <Flex
        align="start"
        justify="between"
        gap="3"
        className={`relative ${dimmed ? 'opacity-50' : ''}`}
      >
        <Box className="min-w-0 flex-1">
          <Heading as={isSaga ? 'h2' : 'h3'} weight="regular">
            <Button
              type="button"
              variant="ghost"
              highContrast
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={onToggle}
              className="m-0! flex h-auto cursor-pointer flex-wrap items-baseline justify-start gap-2 p-0 text-left after:absolute after:inset-0 hover:bg-transparent"
            >
              <Text
                as="span"
                size={isSaga ? '4' : '3'}
                weight="bold"
                className={`font-one-piece text-highlight tracking-wide ${isSaga ? 'text-2xl md:text-3xl' : 'text-xl'}`}
              >
                {title}
              </Text>
              {meta ? (
                <Text
                  as="span"
                  size="1"
                  color="gray"
                  className="text-foreground/55"
                >
                  {meta}
                </Text>
              ) : null}
            </Button>
          </Heading>
          {subtitle ? (
            <Text
              as="p"
              size="1"
              className={`text-foreground/70 mt-1 ${isSaga ? 'font-road-captain tracking-wide' : 'line-clamp-2'}`}
            >
              {subtitle}
            </Text>
          ) : null}
        </Box>

        <Box
          aria-hidden="true"
          className={`text-highlight mt-1 shrink-0 transition-transform duration-300 ease-in-out motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
        >
          <Icon.CaretDown />
        </Box>
      </Flex>

      <Box id={panelId} inert={!isOpen} className="faq-panel">
        <Box className="faq-panel-inner">
          <Flex direction="column" gap="2" className="pt-4">
            {children}
          </Flex>
        </Box>
      </Box>
    </Card>
  );
}
