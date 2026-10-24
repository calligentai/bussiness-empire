export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: false },
  css: ["~/assets/css/tokens.css", "~/assets/css/base.css"],
  app: {
    head: {
      htmlAttrs: { lang: "en" },
      title: "Lava Bean",
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content:
            "Rwandan specialty coffee, calibrated to your taste. Traceable beans, measured recipes, no marketing fog.",
        },
        { name: "theme-color", content: "#141210" },
      ],
      link: [{ rel: "icon", href: "/brand/lavabean-mark.svg", type: "image/svg+xml" }],
    },
  },
});
