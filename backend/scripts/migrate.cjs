// Applies db/migrations/*.up.sql in order and records each in schema_migrations.
//
// Usage (reads DATABASE_URL and DATABASE_SSL from the environment):
//   node scripts/migrate.cjs            apply every pending migration (default: "up")
//   node scripts/migrate.cjs status     list applied / pending migrations, flag edited files
//   node scripts/migrate.cjs down       roll back the most recent migration (see guard below)
//
// Safety:
//   * An advisory lock serialises runners, so two deploys cannot migrate at once.
//   * Each applied file's SHA-256 is stored. If an applied migration is edited
//     afterwards the run fails: add a new migration instead of rewriting history.
//   * "down" runs the matching *.down.sql, which is destructive. It refuses to run
//     unless ALLOW_DESTRUCTIVE_DOWN=true is set.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

const LOCK_ID = 727401; // arbitrary constant shared by every VendorVerse runner
const dir = path.join(__dirname, "..", "db", "migrations");

// Line endings are normalised so a CRLF checkout (Windows autocrlf) hashes the same as LF.
const sha256 = (text) =>
  crypto.createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");
const read = (file) => fs.readFileSync(path.join(dir, file), "utf8");

async function ensureLedger(client) {
  await client.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`,
  );
  await client.query(
    "ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum text",
  );
}

async function appliedMap(client) {
  const rows = (
    await client.query(
      "SELECT name, checksum, applied_at FROM schema_migrations ORDER BY name",
    )
  ).rows;
  return new Map(rows.map((row) => [row.name, row]));
}

async function up(client, files) {
  const applied = await appliedMap(client);
  for (const file of files) {
    const sql = read(file);
    const checksum = sha256(sql);
    const done = applied.get(file);
    if (done) {
      if (!done.checksum) {
        // Applied before checksums existed: record the current file as the baseline.
        await client.query(
          "UPDATE schema_migrations SET checksum = $2 WHERE name = $1",
          [file, checksum],
        );
      } else if (done.checksum !== checksum) {
        throw new Error(
          `${file} was edited after it was applied. Revert it and add a new migration.`,
        );
      }
      console.log(`skip   ${file}`);
      continue;
    }
    await client.query(sql); // each file wraps itself in BEGIN/COMMIT
    await client.query(
      "INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)",
      [file, checksum],
    );
    console.log(`apply  ${file}`);
  }
}

async function status(client, files) {
  const applied = await appliedMap(client);
  for (const file of files) {
    const done = applied.get(file);
    if (!done) console.log(`pending  ${file}`);
    else if (done.checksum && done.checksum !== sha256(read(file)))
      console.log(`EDITED   ${file}  (differs from what was applied)`);
    else console.log(`applied  ${file}  ${done.applied_at.toISOString()}`);
  }
  for (const name of applied.keys())
    if (!files.includes(name)) console.log(`MISSING  ${name}  (applied, but no file)`);
}

async function down(client) {
  if (process.env.ALLOW_DESTRUCTIVE_DOWN !== "true") {
    throw new Error(
      "down is destructive. Set ALLOW_DESTRUCTIVE_DOWN=true to roll back the latest migration.",
    );
  }
  const latest = (
    await client.query(
      "SELECT name FROM schema_migrations ORDER BY name DESC LIMIT 1",
    )
  ).rows[0];
  if (!latest) {
    console.log("nothing to roll back");
    return;
  }
  const downFile = latest.name.replace(/\.up\.sql$/, ".down.sql");
  if (!fs.existsSync(path.join(dir, downFile)))
    throw new Error(`no ${downFile} to roll back ${latest.name}`);
  await client.query(read(downFile));
  await client.query("DELETE FROM schema_migrations WHERE name = $1", [
    latest.name,
  ]);
  console.log(`revert ${latest.name}`);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const command = process.argv[2] ?? "up";
  if (!["up", "status", "down"].includes(command))
    throw new Error(`unknown command "${command}" (use up, status or down)`);
  const ssl = process.env.DATABASE_SSL === "true";
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".up.sql"))
    .sort();

  const client = new Client({ connectionString: url, ssl });
  await client.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);
    await ensureLedger(client);
    if (command === "up") await up(client, files);
    else if (command === "status") await status(client, files);
    else await down(client);
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]).catch(() => {});
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
