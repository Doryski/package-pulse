import { describe, expect, test } from "vitest";
import getRepoNameFromUrl from "./getRepoNameFromUrl";

describe("getRepoNameFromUrl", () => {
  test.each([
    ["https://github.com/facebook/react", "facebook/react"],
    ["https://github.com/facebook/react.git", "facebook/react"],
    ["http://www.github.com/facebook/react/", "facebook/react"],
    ["git+https://github.com/vercel/next.js.git", "vercel/next.js"],
    ["git+ssh://git@github.com/lodash/lodash.git", "lodash/lodash"],
    ["ssh://git@github.com/lodash/lodash.git", "lodash/lodash"],
    ["git://github.com/expressjs/express.git", "expressjs/express"],
    ["git@github.com:sindresorhus/got.git", "sindresorhus/got"],
    ["github:owner/repo", "owner/repo"],
    ["owner/repo", "owner/repo"],
    ["https://github.com/owner/repo#readme", "owner/repo"],
    ["https://github.com/owner/repo.git#main", "owner/repo"],
    ["https://github.com/owner/repo/tree/main/packages/x", "owner/repo"],
    ["https://github.com/owner/repo?tab=readme", "owner/repo"],
    ["https://github.com/owner/owner.github.io", "owner/owner.github.io"],
    [
      "git+https://github.com/owner/owner.github.io.git",
      "owner/owner.github.io",
    ],
    ["https://github.com/owner/my.git.tools", "owner/my.git.tools"],
    ["  https://GitHub.com/Owner/Repo  ", "Owner/Repo"],
  ])("parses %s", (input, expected) => {
    expect(getRepoNameFromUrl(input)).toBe(expected);
  });

  test.each([
    [""],
    ["   "],
    ["https://gitlab.com/owner/repo"],
    ["git+https://bitbucket.org/owner/repo.git"],
    ["gitlab:owner/repo"],
    ["bitbucket:owner/repo"],
    ["gist:11081aaa281"],
    ["https://notgithub.com/owner/repo"],
    ["https://github.com.evil.com/owner/repo"],
    ["https://github.com/owner"],
    ["owner"],
    ["git@gitlab.com:owner/repo.git"],
  ])("returns null for %j", (input) => {
    expect(getRepoNameFromUrl(input)).toBeNull();
  });
});
