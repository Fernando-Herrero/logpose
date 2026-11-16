import type { GetStaticProps } from 'next';

import FaqPageContent from '@/features/landing/page-content/faq.page-content';
import { getDefaultI18nProps } from '@/integrations/i18n/server';

export default function FaqPage() {
  return <FaqPageContent />;
}

export const getStaticProps: GetStaticProps = async context => ({
  props: await getDefaultI18nProps(context),
});
