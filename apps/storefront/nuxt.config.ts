export default defineNuxtConfig({
  devtools: { enabled: true },
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
