const { execSync, spawn } = require("child_process");

function runCommand(command, description) {
  console.info(`\n🚀 ${description}...`);
  try {
    execSync(command, { stdio: "inherit" });
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
    success &= runCommand("npx kill-port 3000", "Stopping dev server");
    success &= runCommand("npm run build", "Building project");
    success &= runCommand("npm run lint:fix", "Fixing lint issues");
    success &= runCommand("npm test -- --watch=false", "Running unit tests");

    console.info("\n🚀 Starting dev server...");
    const devServer = spawn("npm", ["run", "dev"], {
      stdio: "inherit",
      shell: true,
    });

    success &= runCommand(
      "npx wait-on http://localhost:3000",
      "Waiting for dev server to start",
    );
    success &= runCommand(
      "npm run test:e2e -- --reporter=list",
      "Running e2e tests",
    );

    console.info("\n🚀 Stopping dev server...");
    devServer.kill();
    console.info("✅ Dev server stopped.");

    if (success) {
      console.info("\n✅ All verification steps completed successfully!");
    } else {
      console.info(
        "\n❌ Some verification steps failed. Please check the logs above.",
      );
    }
  } catch (error) {
    console.error("\n❌ Error during verification process:", error.message);
    success = false;
  }

  process.exit(success ? 0 : 1);
}

verify();
