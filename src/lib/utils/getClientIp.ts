const getClientIp = (requestHeaders: Pick<Headers, "get">): string => {
  const realIp = requestHeaders.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = requestHeaders.get("x-forwarded-for");
  const segments = forwarded
    ?.split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const trustedHop = segments?.at(-1);
  if (trustedHop) return trustedHop;

  return "unknown";
};

export default getClientIp;
