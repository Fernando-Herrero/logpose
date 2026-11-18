import type { GetServerSideProps } from 'next';

import HomePageContent from '@/features/dashboard/page-content/home.page-content';
import { withDashboardLayout } from '@/features/dashboard/with-dashboard-layout';
import { getDashboardPageProps } from '@/integrations/auth/server';

function DashboardHomePage() {
  return <HomePageContent />;
}

export const getServerSideProps: GetServerSideProps = context =>
  getDashboardPageProps(context);

export default withDashboardLayout(DashboardHomePage);
