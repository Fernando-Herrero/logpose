import { expect, it } from 'vitest';

import { DEFAULT_LOCALE, LOCALES } from '@/integrations/next-i18next/constants';

import config from '../../../next-i18next.config.js';

it('los idiomas de la web coinciden con los que Next lee en next-i18next.config.js', () => {
  expect(config.i18n.locales).toEqual(LOCALES);
  expect(config.i18n.defaultLocale).toBe(DEFAULT_LOCALE);
});
