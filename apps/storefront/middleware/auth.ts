export default defineNuxtRouteMiddleware(async (to) => {
  const session = useAuthSession();
  if (!session.user.value && !(await session.restore())) {
    // Remember where the visitor was headed so login can send them back there
    // instead of dumping everyone on the account overview.
    return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
  }
});
