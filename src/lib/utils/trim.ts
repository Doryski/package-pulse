/**
 * Trims a multi-line string by removing all whitespace sequences of 2 or more
 * @param args - The string to trim
 * @returns The trimmed string
 */
export default function trim(args: TemplateStringsArray) {
  return args
    .join("")
    .replace(/\\\n/g, "")
    .replace(/\s{2,}/g, " ");
}
