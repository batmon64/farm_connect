/** Builds the absolute /auth/confirm URL used as emailRedirectTo / redirectTo. */
export function buildConfirmUrl(origin: string, next: string) {
  const url = new URL("/auth/confirm", origin);
  url.searchParams.set("next", next);
  return url.toString();
}
