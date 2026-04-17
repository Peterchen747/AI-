import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_CONNECTION_URL ?? "file:./sales-tracker.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} satisfies Config;
