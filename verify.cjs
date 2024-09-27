const { execSync, spawn } = require("child_process");
const util = require("util");
const execAsync = util.promisify(require("child_process").exec);

async function runCommand(command, description, async = false) {
  console.info(`\n🚀 ${description}...`);
  try {
    if (async) {
      await execAsync(command);
    } else {
      execSync(command, { stdio: "inherit" });
    }
    console.info(`✅ ${description} completed successfully.`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

async function verify() {
  let success = true;

  try {
    success &= await runCommand(
      "npx kill-port 3000",
      "Stopping dev server",
      true,
    );
    success &= await runCommand("npm run build", "Building project");
    success &= await runCommand("npm run lint:fix", "Fixing lint issues");
    success &= await runCommand(
      "npm test -- --watch=false",
      "Running unit tests",
    );

    console.info("\n🚀 Starting dev server...");
    spawn("npm", ["run", "dev"], {
      stdio: "inherit",
      shell: true,
    });

    success &= await runCommand(
      "npx wait-on http://localhost:3000",
      "Waiting for dev server to start",
    );
    success &= await runCommand(
      "npm run test:e2e -- --reporter=list",
      "Running e2e tests",
    );
  } catch (error) {
    console.error("\n❌ Error during verification process:", error.message);
    success = false;
  } finally {
    await runCommand("npx kill-port 3000", "Stopping dev server", true);
  }

  process.exit(success ? 0 : 1);
}

verify();
