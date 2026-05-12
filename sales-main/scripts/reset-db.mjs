import { createClient } from "@libsql/client";

const url = process.env.TURSO_CONNECTION_URL ?? "file:./sales-tracker.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const client = createClient({ url, authToken });

async function main() {
  console.log("Resetting all data...");
  await client.execute("PRAGMA foreign_keys = OFF");

  const tables = [
    "sales",
    "inventory_records",
    "purchase_batches",
    "weekly_costs",
    "share_tokens",
    "import_batches",
    "screenshots",
    "items",
    "categories",
    "session",
    "account",
    "verificationToken",
    "user",
  ];

  for (const table of tables) {
    try {
      await client.execute(`DELETE FROM ${table}`);
      console.log(`  cleared: ${table}`);
    } catch (e) {
      console.log(`  skipped: ${table} (${e.message})`);
    }
  }

  await client.execute("PRAGMA foreign_keys = ON");
  console.log("Done. All tables cleared.");
}

main().catch(console.error);
