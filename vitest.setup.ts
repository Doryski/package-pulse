import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import dotenv from "dotenv";
import { afterEach } from "vitest";

dotenv.config({ path: ".env.local", quiet: true });

afterEach(() => {
  cleanup();
});
