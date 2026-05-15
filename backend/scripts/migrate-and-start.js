const { execSync } = require("child_process");

function run(cmd) {
  console.log(`> ${cmd}`);
  try {
    const result = execSync(cmd, { stdio: "inherit", env: { ...process.env } });
    return true;
  } catch (e) {
    console.error(`Command failed: ${cmd}`);
    return false;
  }
}

// Step 1: Try normal migration deploy
console.log("=== Running prisma migrate deploy ===");
const migrateOk = run("npx prisma migrate deploy");

if (migrateOk) {
  console.log("=== Migrations applied successfully ===");
} else {
  console.log("=== Migration deploy failed, attempting baseline resolution ===");

  // Step 2: If deploy failed, mark the baseline migration as already applied
  // This handles the case where the DB already has all tables from prior migrations
  // but the migration history doesn't match the new squashed migration names
  const resolveOk = run("npx prisma migrate resolve --applied 0_init");

  if (resolveOk) {
    console.log("=== Baseline migration resolved ===");
    // Step 3: Try deploy again after resolving baseline
    const retryOk = run("npx prisma migrate deploy");
    if (!retryOk) {
      console.error("=== Migration deploy failed after baseline resolution ===");
      process.exit(1);
    }
  } else {
    console.error("=== Baseline resolution failed, DB may already be in sync ===");
    // Don't exit - the DB might already be in the correct state
    // Continue to start the server
  }
}

// Step 4: Start the server
console.log("=== Starting server ===");
run("node src/index.js");