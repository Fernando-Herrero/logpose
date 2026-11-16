import type { GetServerSideProps } from 'next';

import { withDashboardLayout } from '@/features/dashboard/with-dashboard-layout';
import SeriePageContent from '@/features/serie/serie.page-content';
import { getDashboardPageProps } from '@/integrations/auth/server';

function DashboardSeriePage() {
  return <SeriePageContent />;
}

export const getServerSideProps: GetServerSideProps = context =>
  getDashboardPageProps(context, ['serie']);

export default withDashboardLayout(DashboardSeriePage);
