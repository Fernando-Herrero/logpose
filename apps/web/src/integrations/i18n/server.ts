import type { FlatNamespace } from 'i18next';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';

import { DEFAULT_LOCALE } from '@/integrations/next-i18next/constants';

/** `common` siempre; el resto solo en la página que lo pinta (`serie` pesa ~125 KB por idioma). */
export async function getDefaultI18nProps(
  { locale }: { locale?: string },
  extraNamespaces: FlatNamespace[] = [],
) {
  return serverSideTranslations(locale ?? DEFAULT_LOCALE, [
    'common',
    ...extraNamespaces,
  ]);
}
