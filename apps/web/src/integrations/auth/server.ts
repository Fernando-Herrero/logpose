/**
 * Helpers de auth para `getServerSideProps` en páginas del dashboard.
 * Valida la sesión contra la API Nest en SSR, rellena TanStack Query y aplica redirects.
 */
import { sessionUserSchema } from '@logpose/contracts/common/user.schemas';
import { dehydrate, QueryClient } from '@tanstack/react-query';
import type { FlatNamespace } from 'i18next';
import type { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';

import { authKeys } from '@/features/auth/api/auth.keys';
import type { SessionUser } from '@/features/auth/api/session-user';
import { getAuthenticatedHomePath } from '@/features/auth/auth-routes';
import { env } from '@/integrations/env/server.mjs';
import { getDefaultI18nProps } from '@/integrations/i18n/server';

/**
 * Llama a `/api/auth/me` reenviando las cookies del request. Devuelve null solo sin sesión (401);
 * cualquier otro fallo lanza, para no confundir «API caída» con «no hay sesión».
 */
async function fetchSessionUser(
  context: GetServerSidePropsContext,
): Promise<SessionUser | null> {
  const cookie = context.req.headers.cookie;

  if (!cookie) {
    return null;
  }

  const response = await fetch(`${env.API_INTERNAL_URL}/api/auth/me`, {
    headers: { cookie },
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`GET /api/auth/me responded ${response.status}`);
  }

  return sessionUserSchema.parse(await response.json());
}

/** Precarga `authKeys.me()` en el QueryClient y serializa el estado para hidratar el cliente. */
async function buildAuthenticatedPageProps(
  context: GetServerSidePropsContext,
  user: SessionUser,
  namespaces: FlatNamespace[] = [],
) {
  const queryClient = new QueryClient();
  queryClient.setQueryData(authKeys.me(), user);
  return {
    ...(await getDefaultI18nProps(context, namespaces)),
    dehydratedState: dehydrate(queryClient),
  };
}

type SessionRedirect = {
  redirect: { destination: string; permanent: false };
};

/** Exige sesión: devuelve el usuario o un redirect a `/login`. */
async function requireSessionUser(
  context: GetServerSidePropsContext,
): Promise<SessionUser | SessionRedirect> {
  const user = await fetchSessionUser(context);

  if (!user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  return user;
}

/** GSSP para rutas protegidas del dashboard (`/dashboard/*`). Redirige a login si no hay sesión. */
export async function getDashboardPageProps(
  context: GetServerSidePropsContext,
  namespaces: FlatNamespace[] = [],
): Promise<GetServerSidePropsResult<Record<string, unknown>>> {
  const result = await requireSessionUser(context);

  if ('redirect' in result) {
    return { redirect: result.redirect };
  }

  return {
    props: await buildAuthenticatedPageProps(context, result, namespaces),
  };
}

/** GSSP para login/register: si ya hay sesión, redirige al home según rol. */
export async function getGuestAuthPageProps(
  context: GetServerSidePropsContext,
): Promise<GetServerSidePropsResult<Record<string, unknown>>> {
  // Sin API el formulario se pinta igual: el envío ya enseña el error de red.
  const user = await fetchSessionUser(context).catch(() => null);

  if (user) {
    return {
      redirect: {
        destination: getAuthenticatedHomePath(user),
        permanent: false,
      },
    };
  }

  return {
    props: await getDefaultI18nProps(context),
  };
}

/** GSSP para rutas admin: exige sesión y rol `admin`; si no, redirige a perfil. */
export async function getAdminDashboardPageProps(
  context: GetServerSidePropsContext,
): Promise<GetServerSidePropsResult<Record<string, unknown>>> {
  const result = await requireSessionUser(context);

  if ('redirect' in result) {
    return { redirect: result.redirect };
  }

  if (result.role !== 'admin') {
    return {
      redirect: {
        destination: '/dashboard/profile',
        permanent: false,
      },
    };
  }

  return {
    props: await buildAuthenticatedPageProps(context, result),
  };
}
