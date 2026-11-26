import { useTranslation } from 'next-i18next/pages';

/** Primer foco de la página: salta la cabecera y el menú. El destino es `<main id="main">`. */
export function SkipLink() {
  const { t } = useTranslation();

  return (
    <a
      href="#main"
      className="bg-deep text-highlight sr-only z-100 rounded-md px-4 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
    >
      {t('a11y.skip_to_content')}
    </a>
  );
}
