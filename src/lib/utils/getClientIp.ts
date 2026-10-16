const IPV6_GROUP_COUNT = 8;
const IPV6_PREFIX_GROUPS = 4;
const IPV6_GROUP_PATTERN = /^[0-9a-f]{1,4}$/;
const IPV4_PATTERN = /^(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/;
const BRACKETED_PATTERN = /^\[([^\]]+)\](?::\d+)?$/;
const IPV4_MAPPED_PATTERN = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/;
const EMBEDDED_IPV4_PATTERN = /^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/;

const toHextets = (ipv4: string) => {
  const [a = 0, b = 0, c = 0, d = 0] = ipv4.split(".").map(Number);
  return `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
};

const replaceEmbeddedIpv4 = (address: string) => {
  const match = address.match(EMBEDDED_IPV4_PATTERN);
  if (!match) return address;
  return `${match[1]}${toHextets(match[2]!)}`;
};

const splitGroups = (part: string) => (part ? part.split(":") : []);

const expandIpv6 = (address: string): string[] | null => {
  const halves = replaceEmbeddedIpv4(address).split("::");
  if (halves.length > 2) return null;

  const head = splitGroups(halves[0]!);
  const tail = halves.length === 2 ? splitGroups(halves[1]!) : [];
  const missing = IPV6_GROUP_COUNT - head.length - tail.length;
  const isCompressed = halves.length === 2;

  if (isCompressed ? missing < 1 : missing !== 0) return null;

  const groups = [
    ...head,
    ...Array.from({ length: isCompressed ? missing : 0 }, () => "0"),
    ...tail,
  ];
  if (!groups.every((group) => IPV6_GROUP_PATTERN.test(group))) return null;
  return groups;
};

const toIpv6Prefix = (groups: string[]) =>
  `${groups
    .slice(0, IPV6_PREFIX_GROUPS)
    .map((group) => parseInt(group, 16).toString(16))
    .join(":")}::/64`;

export const normalizeIp = (rawIp: string): string => {
  const ip = rawIp.trim().toLowerCase();
  const unbracketed = ip.match(BRACKETED_PATTERN)?.[1] ?? ip;

  const ipv4 = unbracketed.match(IPV4_PATTERN)?.[1];
  if (ipv4) return ipv4;

  const address = unbracketed.split("%")[0]!;
  const mappedIpv4 = address.match(IPV4_MAPPED_PATTERN)?.[1];
  if (mappedIpv4) return mappedIpv4;

  const groups = expandIpv6(address);
  if (!groups) return ip;
  return toIpv6Prefix(groups);
};

const getClientIp = (requestHeaders: Pick<Headers, "get">): string => {
  const realIp = requestHeaders.get("x-real-ip")?.trim();
  if (realIp) return normalizeIp(realIp);

  const forwarded = requestHeaders.get("x-forwarded-for");
  const segments = forwarded
    ?.split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const trustedHop = segments?.at(-1);
  if (trustedHop) return normalizeIp(trustedHop);

  return "unknown";
};

export default getClientIp;
