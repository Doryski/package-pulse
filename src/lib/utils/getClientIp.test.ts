import { describe, expect, test } from "vitest";
import getClientIp, { normalizeIp } from "./getClientIp";

const headersFrom = (values: Record<string, string>) => ({
  get: (name: string) => values[name] ?? null,
});

describe("normalizeIp", () => {
  test.each([
    ["203.0.113.7", "203.0.113.7"],
    ["203.0.113.7:8080", "203.0.113.7"],
    ["2001:db8:85a3:1:aaaa:bbbb:cccc:dddd", "2001:db8:85a3:1::/64"],
    ["2001:0DB8:0000:0001::1", "2001:db8:0:1::/64"],
    ["2001:db8::1", "2001:db8:0:0::/64"],
    ["[2001:db8:1:2::5]:443", "2001:db8:1:2::/64"],
    ["fe80::1%eth0", "fe80:0:0:0::/64"],
    ["::ffff:198.51.100.4", "198.51.100.4"],
    ["::1", "0:0:0:0::/64"],
    ["64:ff9b::192.0.2.33", "64:ff9b:0:0::/64"],
    ["not-an-ip", "not-an-ip"],
    ["1:2:3:4:5:6:7:8:9", "1:2:3:4:5:6:7:8:9"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeIp(input)).toBe(expected);
  });

  test("maps addresses within the same /64 to one key", () => {
    expect(normalizeIp("2001:db8:1:2:aaaa::1")).toBe(
      normalizeIp("2001:db8:1:2:ffff:ffff:ffff:ffff"),
    );
  });

  test("keeps addresses in different /64 prefixes apart", () => {
    expect(normalizeIp("2001:db8:1:2::1")).not.toBe(
      normalizeIp("2001:db8:1:3::1"),
    );
  });
});

describe("getClientIp", () => {
  test("prefers x-real-ip", () => {
    expect(
      getClientIp(
        headersFrom({
          "x-real-ip": " 10.0.0.1 ",
          "x-forwarded-for": "1.1.1.1",
        }),
      ),
    ).toBe("10.0.0.1");
  });

  test("uses the last x-forwarded-for hop", () => {
    expect(
      getClientIp(
        headersFrom({ "x-forwarded-for": "6.6.6.6, 2001:db8:a:b:c:d:e:f" }),
      ),
    ).toBe("2001:db8:a:b::/64");
  });

  test("normalizes IPv6 x-real-ip to its /64 prefix", () => {
    expect(
      getClientIp(headersFrom({ "x-real-ip": "2001:db8:1:2::abcd" })),
    ).toBe("2001:db8:1:2::/64");
  });

  test("returns unknown without client headers", () => {
    expect(getClientIp(headersFrom({}))).toBe("unknown");
    expect(getClientIp(headersFrom({ "x-forwarded-for": " , " }))).toBe(
      "unknown",
    );
  });
});
