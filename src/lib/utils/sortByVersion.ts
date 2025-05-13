import { VersionData } from "@/components/ui/line-chart";

export default function sortByVersion(versions: VersionData[]) {
  return versions.toSorted((a, b) => {
    const splitA = a.version.split(".");
    const splitB = b.version.split(".");
    if (splitA.length !== 3 || splitB.length !== 3) {
      return 0;
    }

    const aFirstInt = parseInt(splitA[0]!);
    const bFirstInt = parseInt(splitB[0]!);
    if (aFirstInt !== bFirstInt) {
      return aFirstInt - bFirstInt;
    }
    const aSecondInt = parseInt(splitA[1]!);
    const bSecondInt = parseInt(splitB[1]!);
    if (aSecondInt !== bSecondInt) {
      return aSecondInt - bSecondInt;
    }

    const aThirdInt = parseInt(splitA[2]!);
    const bThirdInt = parseInt(splitB[2]!);
    return aThirdInt - bThirdInt;
  });
}
