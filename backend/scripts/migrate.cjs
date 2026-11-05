// Applies db/migrations/*.up.sql in order and records each in schema_migrations.
// Usage: node scripts/migrate.cjs   (reads DATABASE_URL and DATABASE_SSL from the environment)
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const ssl = process.env.DATABASE_SSL === "true";
  const dir = path.join(__dirname, "..", "db", "migrations");
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".up.sql"))
    .sort();

  const client = new Client({ connectionString: url, ssl });
  await client.connect();
  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         name text PRIMARY KEY,
         applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
       )`,
    );
    const applied = new Set(
      (await client.query("SELECT name FROM schema_migrations")).rows.map(
        (row) => row.name,
      ),
    );
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`skip   ${file}`);
        continue;
      }
      await client.query(fs.readFileSync(path.join(dir, file), "utf8"));
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
        file,
      ]);
      console.log(`apply  ${file}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
