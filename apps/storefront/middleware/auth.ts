export default defineNuxtRouteMiddleware(async () => {
  const session = useAuthSession();
  if (!session.user.value && !(await session.restore())) return navigateTo("/login");
});
