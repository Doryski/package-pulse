import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

// TODO: stream output to console real-time so user sees progress
export async function runCommand(command: string, description: string) {
  console.info(`\n🚀 ${description}...`);
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stderr) console.error(stderr);
    console.info(stdout);
    console.info(`✅ ${description} completed successfully.`);
    return stdout.trim();
  } catch (error) {
    console.error(
      `❌ ${description} failed:`,
      error instanceof Error ? error.message : error,
    );
    throw error;
  }
}

async function runPlaywrightTests() {
  await runCommand(
    "npx playwright install --with-deps",
    "Installing playwright and dependencies",
  );

  console.info("🚀 Running UI tests...");
  try {
    await runCommand("npm run test:e2e", "Running UI tests");
    console.info("✅ UI tests completed successfully.");
  } catch (error) {
    console.error("❌ UI tests failed:", error);
    throw new Error("Playwright tests failed");
  }
}

async function verify() {
  try {
    await runCommand("npx kill-port 3000", "Stopping dev server");
    await runCommand("npm run build", "Building project");
    await runCommand("npm run lint:fix", "Fixing lint issues");
    await runCommand("npm test", "Running unit tests");

    console.info("\n🚀 Starting dev server...");
    await runPlaywrightTests();
    console.info("\n✅ Verification completed successfully.");
  } catch (error) {
    console.error(
      "\n❌ Error during verification process:",
      error instanceof Error ? error.message : error,
    );
    console.info("\n❌ Verification failed. See above for details.");
    process.exitCode = 1;
  }
}

verify();
