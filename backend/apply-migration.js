const { Client } = require("pg");

async function main() {
  if (!process.env.DIRECT_URL) {
    console.error("DIRECT_URL environment variable is required");
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DIRECT_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to database");

  await client.query('ALTER TABLE "InviteLink" ADD COLUMN IF NOT EXISTS "email" TEXT;');
  console.log("Migration applied: added email column to InviteLink");

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});