import type { GetStaticProps } from 'next';

import MapPageContent from '@/features/landing/page-content/map.page-content';
import { getDefaultI18nProps } from '@/integrations/i18n/server';

export default function MapPage() {
  return <MapPageContent />;
}

export const getStaticProps: GetStaticProps = async context => ({
  props: await getDefaultI18nProps(context),
});
