/**
 * Restores the session on first load so every page — including public ones like
 * the homepage — reflects whether the visitor is signed in. Runs on the server
 * first (so the rendered header already shows the user, no flash) and on the
 * client only when SSR did not already populate the state.
 */
export default defineNuxtPlugin(async () => {
  const session = useAuthSession();
  if (!session.accessToken.value) return;
  if (import.meta.server) {
    await session.restore().catch(() => undefined);
    return;
  }
  if (!session.user.value) {
    await session.restore().catch(() => undefined);
  }
});
