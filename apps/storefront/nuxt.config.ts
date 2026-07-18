export default defineNuxtConfig({
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? "http://localhost:3102/api/v1"
    }
  },
  app: {
    head: {
      title: "MoeCraft Storefront",
      meta: [
        {
          name: "description",
          content: "MoeCraft 同人手办商城前台"
        }
      ]
    }
  },
  compatibilityDate: "2025-07-01"
});
