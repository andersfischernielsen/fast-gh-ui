export interface DiffLine {
  type: "add" | "remove" | "context" | "header";
  oldLine: number | null;
  newLine: number | null;
  content: string;
}

export function parsePatch(patch: string): DiffLine[] {
  const result: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;
  for (const line of patch.split("\n")) {
    if (line.startsWith("@@")) {
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (match) {
        oldLine = Number(match[1]) - 1;
        newLine = Number(match[2]) - 1;
      }
      result.push({
        type: "header",
        oldLine: null,
        newLine: null,
        content: line,
      });
    } else if (line.startsWith("+")) {
      newLine++;
      result.push({
        type: "add",
        oldLine: null,
        newLine,
        content: line.substring(1),
      });
    } else if (line.startsWith("-")) {
      oldLine++;
      result.push({
        type: "remove",
        oldLine,
        newLine: null,
        content: line.substring(1),
      });
    } else {
      oldLine++;
      newLine++;
      result.push({
        type: "context",
        oldLine,
        newLine,
        content: line.startsWith(" ") ? line.substring(1) : line,
      });
    }
  }
  return result;
}

export function suggestionLinesFromPatch(
  lines: DiffLine[],
  side: "LEFT" | "RIGHT",
  start: number,
  end: number,
): string[] {
  return lines
    .filter((l) => {
      const n = side === "RIGHT" ? l.newLine : l.oldLine;
      return n != null && n >= start && n <= end;
    })
    .map((l) => l.content);
}
