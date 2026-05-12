import { createClient } from "@libsql/client";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const bcrypt = require("bcryptjs");

const url = process.env.TURSO_CONNECTION_URL ?? "file:./sales-tracker.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const client = createClient({ url, authToken });

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  console.error("Usage: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpassword node scripts/create-admin.mjs");
  process.exit(1);
}

async function main() {
  // ensure user table and password column exist
  await client.execute(`CREATE TABLE IF NOT EXISTS user (id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, emailVerified INTEGER, image TEXT, password TEXT)`);
  try {
    await client.execute("ALTER TABLE user ADD COLUMN password TEXT");
  } catch { /* column already exists */ }

  const hash = await bcrypt.hash(adminPassword, 12);
  const id = crypto.randomUUID();

  try {
    await client.execute({
      sql: "INSERT INTO user (id, name, email, password) VALUES (?, ?, ?, ?)",
      args: [id, "Admin", adminEmail, hash],
    });
    console.log(`Admin created: ${adminEmail}`);
  } catch (e) {
    if (e.message?.includes("UNIQUE")) {
      await client.execute({
        sql: "UPDATE user SET password = ? WHERE email = ?",
        args: [hash, adminEmail],
      });
      console.log(`Admin password updated for: ${adminEmail}`);
    } else {
      throw e;
    }
  }
}

main().catch(console.error);
