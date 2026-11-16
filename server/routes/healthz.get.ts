export default defineEventHandler(() => ({
  status: "ok",
  environment: process.env.APP_ENV ?? "development",
  revision: process.env.APP_REVISION ?? "local",
}));
