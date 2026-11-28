import { useMemo } from 'react';
import { useCustom } from '../../core/hooks/data/useCustom';
import { normalizeLoginPage } from '../../core/config/loginUi';

// What the signed-out pages need from /auth/login_options: the sign-in
// columns the server accepts and the sign-in page's look. One request,
// shared by every page that asks.
export default function useLoginOptions() {
  const { data, isLoading } = useCustom({
    url: 'auth/login_options',
    unwrap: true,
    // One quick retry: when the server cannot be reached the page shows
    // its default look instead of waiting.
    queryOptions: { staleTime: 60_000, retry: 1 },
  });
  const options = data?.data;
  return useMemo(() => ({
    identifiers: options?.identifiers ?? ['email', 'custom_id'],
    page: normalizeLoginPage(options?.page),
    isLoading,
  }), [options, isLoading]);
}
