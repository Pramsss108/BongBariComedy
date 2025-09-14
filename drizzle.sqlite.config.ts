import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./shared/schema.sqlite.ts",
  out: "./migrations/sqlite",
  dialect: "sqlite",
  dbCredentials: {
    url: "./bongbari.sqlite",
  },
});
