import { loadEnv, defineConfig } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

const required = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required. Do not commit a filled secret.`);
  }
  return value;
};

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: required("DATABASE_URL"),
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:3000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:9000",
      authCors: process.env.AUTH_CORS || "http://localhost:9000",
      jwtSecret: required("JWT_SECRET"),
      cookieSecret: required("COOKIE_SECRET"),
    },
  },
  admin: {
    disable: true,
  },
  modules: [
    {
      resolve: "./src/modules/lavabean",
    },
  ],
});
