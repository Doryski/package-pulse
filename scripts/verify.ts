import { ChildProcess, spawn } from "child_process";

export async function runCommand(
  command: string,
  description: string,
): Promise<string> {
  console.info(`\n🚀 ${description}...`);

  return new Promise((resolve, reject) => {
    const args = command.split(" ");
    const cmd = args.shift();

    if (!cmd) {
      reject(new Error("No command provided"));
      return;
    }

    const child: ChildProcess = spawn(cmd, args, {
      stdio: ["inherit", "pipe", "pipe"],
      shell: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data: Buffer) => {
      const output = data.toString();
      process.stdout.write(output);
      stdout += output;
    });

    child.stderr?.on("data", (data: Buffer) => {
      const output = data.toString();
      process.stderr.write(output);
      stderr += output;
    });

    child.on("close", (code: number | null) => {
      if (code === 0) {
        console.info(`✅ ${description} completed successfully.`);
        resolve(stdout.trim());
      } else {
        console.error(`❌ ${description} failed with exit code ${code}`);
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on("error", (error: Error) => {
      console.error(`❌ ${description} failed:`, error.message);
      reject(error);
    });
  });
}

async function runPlaywrightTests() {
  await runCommand(
    "npx playwright install --with-deps",
    "Installing playwright and dependencies",
  );

  console.info("🚀 Running UI tests...");
  try {
    await runCommand("npm run test:e2e -- --reporter=list", "Running UI tests");
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
