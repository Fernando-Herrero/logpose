import type { GetStaticProps } from 'next';

import CharactersPageContent from '@/features/landing/page-content/characters.page-content';
import { getDefaultI18nProps } from '@/integrations/i18n/server';

export default function CharactersPage() {
  return <CharactersPageContent />;
}

export const getStaticProps: GetStaticProps = async context => ({
  props: await getDefaultI18nProps(context),
});
