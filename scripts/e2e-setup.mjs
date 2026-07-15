import bcrypt from "bcryptjs";
import pg from "pg";

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();
try {
  const passwordHash = await bcrypt.hash("AdminE2EPassword!123", 12);
  await client.query("DELETE FROM users WHERE email = $1", ["admin.e2e@example.test"]);
  await client.query(
    `INSERT INTO users (name, email, phone, password_hash, role, segment, b2b_status)
     VALUES ($1, $2, $3, $4, 'admin', 'b2c', 'none')`,
    ["E2E Administrator", "admin.e2e@example.test", "+79990000000", passwordHash]
  );
} finally {
  await client.end();
}
