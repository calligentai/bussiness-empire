export default defineEventHandler((event) => {
  if (process.env.APP_ENV === "staging") {
    setResponseHeader(event, "X-Robots-Tag", "noindex, nofollow, noarchive");
    setResponseHeader(event, "Cache-Control", "no-store");
  }
});
