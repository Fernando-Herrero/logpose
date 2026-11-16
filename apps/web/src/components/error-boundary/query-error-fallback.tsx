import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next/pages';
import type { FallbackProps } from 'react-error-boundary';

import { PageError } from '@/components/error-boundary/page-error';

export function QueryErrorFallback({ resetErrorBoundary }: FallbackProps) {
  const { t } = useTranslation();
  const { reset } = useQueryErrorResetBoundary();

  return (
    <PageError
      title={t('errors.title')}
      message={t('errors.message')}
      onRetry={() => {
        // Sin esto, la query vuelve a montarse con el error de la caché y no se pide otra vez.
        reset();
        resetErrorBoundary();
      }}
      retryText={t('errors.retry')}
    />
  );
}
