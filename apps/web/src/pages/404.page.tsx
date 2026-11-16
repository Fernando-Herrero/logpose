import type { GetStaticProps } from 'next';

import NotFoundPageContent from '@/features/landing/page-content/not-found.page-content';
import { getDefaultI18nProps } from '@/integrations/i18n/server';

export default function NotFoundPage() {
  return <NotFoundPageContent />;
}

export const getStaticProps: GetStaticProps = async context => ({
  props: await getDefaultI18nProps(context),
});
