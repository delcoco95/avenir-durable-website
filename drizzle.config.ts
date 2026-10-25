import { defineConfig } from "drizzle-kit";
import { loadEnv } from "./scripts/load-env";

loadEnv();

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./database/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
});
