import type { GetStaticProps } from 'next';

import HistoryPageContent from '@/features/landing/page-content/history.page-content';
import { getDefaultI18nProps } from '@/integrations/i18n/server';

export default function HistoryPage() {
  return <HistoryPageContent />;
}

export const getStaticProps: GetStaticProps = async context => ({
  props: await getDefaultI18nProps(context),
});
