// Creates the FIRST Super Admin. Every later grant goes through the audited admin API
// (POST /v1/admin/users/{userId}/roles), which needs an existing Super Admin.
// Usage: node --env-file=.env scripts/grant-first-super-admin.cjs <phone|email> <normalized value> "<reason>"
// The value must match user_identifiers.normalized_value exactly (the user must have signed up first).
// Refuses to run when a Super Admin already exists.
const { randomUUID } = require("node:crypto");
const { Client } = require("pg");

async function main() {
  const [channel, value, reason] = process.argv.slice(2);
  if (!["phone", "email"].includes(channel) || !value || !reason?.trim()) {
    throw new Error(
      'Usage: grant-first-super-admin.cjs <phone|email> <normalized value> "<reason>"',
    );
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const client = new Client({
    connectionString: url,
    ssl: process.env.DATABASE_SSL === "true",
  });
  await client.connect();
  try {
    await client.query("BEGIN");
    // Serialise two operators running this at once.
    await client.query("LOCK TABLE user_role_assignments IN SHARE ROW EXCLUSIVE MODE");
    const existing = await client.query(
      `SELECT 1 FROM user_role_assignments
       WHERE role_code = 'SUPER_ADMIN' AND revoked_at IS NULL`,
    );
    if (existing.rowCount > 0) {
      throw new Error(
        "A Super Admin already exists. Grant further roles through the admin API.",
      );
    }
    const found = await client.query(
      `SELECT user_id FROM user_identifiers
       WHERE channel = $1 AND normalized_value = $2`,
      [channel, value],
    );
    if (found.rowCount !== 1) {
      throw new Error("No user has that identifier. They must sign up first.");
    }
    const userId = found.rows[0].user_id;
    const assignmentId = randomUUID();
    await client.query(
      `INSERT INTO user_role_assignments (id, user_id, role_code, grant_reason)
       VALUES ($1, $2, 'SUPER_ADMIN', $3)`,
      [assignmentId, userId, reason.trim()],
    );
    await client.query(
      `INSERT INTO audit_events
         (actor_service, action, target_type, target_id, reason, metadata)
       VALUES ('grant-first-super-admin', 'rbac.role_granted', 'user', $1, $2, $3::jsonb)`,
      [userId, reason.trim(), JSON.stringify({ roleCode: "SUPER_ADMIN", assignmentId, bootstrap: true })],
    );
    await client.query("COMMIT");
    console.log(`SUPER_ADMIN granted to user ${userId}`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
