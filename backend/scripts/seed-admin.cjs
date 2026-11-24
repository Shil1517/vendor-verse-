// Creates or updates the Super Admin account used for password sign-in (POST /v1/auth/admin/login).
// Reads ADMIN_LOGIN_ID (an email) and ADMIN_PASSWORD from the environment (backend/.env, which is gitignored);
// the password is never written anywhere except as a salted scrypt hash (same format as src/auth/password.ts).
// Usage: npm run db:seed:admin
// Idempotent: re-running updates the password and makes sure the SUPER_ADMIN role is assigned.
const { randomBytes, randomUUID, scryptSync } = require("node:crypto");
const { Client } = require("pg");

const hashPassword = (password) => {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("base64")}$${hash.toString("base64")}`;
};

async function main() {
  const loginId = (process.env.ADMIN_LOGIN_ID || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!loginId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginId)) {
    throw new Error("ADMIN_LOGIN_ID must be set to an email address");
  }
  if (password.length < 8) throw new Error("ADMIN_PASSWORD must be set (at least 8 characters)");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const client = new Client({ connectionString: url, ssl: process.env.DATABASE_SSL === "true" });
  client.on("error", (error) => console.error(`PostgreSQL connection lost: ${error.message}`));
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query("LOCK TABLE user_role_assignments IN SHARE ROW EXCLUSIVE MODE");
    let userId = (await client.query(
      `SELECT user_id FROM user_identifiers WHERE channel = 'email' AND normalized_value = $1`,
      [loginId],
    )).rows[0]?.user_id;
    if (!userId) {
      userId = randomUUID();
      await client.query(
        `INSERT INTO users (id, account_status, current_mode) VALUES ($1, 'active', 'customer')`,
        [userId],
      );
      await client.query(
        `INSERT INTO user_identifiers (id, user_id, channel, normalized_value, verified_at)
         VALUES ($1, $2, 'email', $3, CURRENT_TIMESTAMP)`,
        [randomUUID(), userId, loginId],
      );
    }
    const hasRole = await client.query(
      `SELECT 1 FROM user_role_assignments
       WHERE user_id = $1 AND role_code = 'SUPER_ADMIN' AND revoked_at IS NULL`,
      [userId],
    );
    if (hasRole.rowCount === 0) {
      const assignmentId = randomUUID();
      await client.query(
        `INSERT INTO user_role_assignments (id, user_id, role_code, grant_reason)
         VALUES ($1, $2, 'SUPER_ADMIN', 'Seeded admin account for password sign-in')`,
        [assignmentId, userId],
      );
      await client.query(
        `INSERT INTO audit_events (actor_service, action, target_type, target_id, reason, metadata)
         VALUES ('seed-admin', 'rbac.role_granted', 'user', $1, 'Seeded admin account for password sign-in', $2::jsonb)`,
        [userId, JSON.stringify({ roleCode: "SUPER_ADMIN", assignmentId, bootstrap: true })],
      );
    }
    await client.query(
      `INSERT INTO admin_credentials (user_id, login_id, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE
       SET login_id = EXCLUDED.login_id, password_hash = EXCLUDED.password_hash,
           password_changed_at = CURRENT_TIMESTAMP`,
      [userId, loginId, hashPassword(password)],
    );
    await client.query("COMMIT");
    console.log(`Admin ${loginId} is ready (user ${userId}).`);
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
