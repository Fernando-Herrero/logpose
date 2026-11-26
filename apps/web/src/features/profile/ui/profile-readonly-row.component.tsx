import { Flex, Text } from '@radix-ui/themes';

type ProfileReadonlyRowProps = {
  label: string;
  value: string;
  emptyText?: string;
};

export function ProfileReadonlyRow({
  label,
  value,
  emptyText,
}: ProfileReadonlyRowProps) {
  const display = value.trim();

  return (
    <Flex asChild direction="column" gap="1">
      <div>
        <Text asChild size="1" color="gray">
          <dt>{label}</dt>
        </Text>
        <Text
          asChild
          size="2"
          className={
            display ? 'text-foreground/85' : 'text-foreground/50 italic'
          }
        >
          <dd className="m-0">{display || (emptyText ?? '—')}</dd>
        </Text>
      </div>
    </Flex>
  );
}
