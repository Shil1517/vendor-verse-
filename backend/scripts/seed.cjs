// Runs db/seeds/*.sql in order. Seeds must be idempotent (ON CONFLICT DO NOTHING).
// Usage: node scripts/seed.cjs   (reads DATABASE_URL and DATABASE_SSL from the environment)
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const ssl = process.env.DATABASE_SSL === "true";
  const dir = path.join(__dirname, "..", "db", "seeds");
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const client = new Client({ connectionString: url, ssl });
  await client.connect();
  try {
    for (const file of files) {
      await client.query(fs.readFileSync(path.join(dir, file), "utf8"));
      console.log(`seeded ${file}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
