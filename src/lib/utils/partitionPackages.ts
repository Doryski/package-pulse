type PartitionedPackages = { unscoped: string[]; scoped: string[] };

export default function partitionPackages(
  packages: string[],
): PartitionedPackages {
  const unscoped: string[] = [];
  const scoped: string[] = [];

  for (const name of packages) {
    if (name.startsWith("@")) {
      scoped.push(name);
      continue;
    }
    unscoped.push(name);
  }

  return { unscoped, scoped };
}
