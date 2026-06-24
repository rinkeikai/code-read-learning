const FILE_HEADER_RE = /^diff --git a\/(.+?) b\/(.+)$/;
const HUNK_HEADER_RE = /^@@ .+ @@\s*(.*)$/;

export function extractFilesFromDiff(diff: string): string[] {
  const files: string[] = [];
  const seen = new Set<string>();

  for (const line of diff.split("\n")) {
    const match = line.match(FILE_HEADER_RE);
    if (!match) {
      continue;
    }

    const filePath = match[2];
    if (!seen.has(filePath)) {
      seen.add(filePath);
      files.push(filePath);
    }
  }

  return files;
}

export function extractFunctionName(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*")) {
    return null;
  }

  const patterns: RegExp[] = [
    /#(\w+)\s*\(/,
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
    /(?:export\s+)?(?:async\s+)?function\s*#(\w+)/,
    /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:function|\([^)]*\)\s*=>)/,
    /(?:public|private|protected)\s+(?:async\s+)?(\w+)\s*\(/,
    /(?:public|private|protected)\s+#(\w+)\s*\(/,
    /^\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[\w<>,\s|?\[\]]+)?\s*\{?\s*$/,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (!match) {
      continue;
    }

    const name = match[1];
    if (!name || isCommonKeyword(name)) {
      continue;
    }

    if (pattern.source.startsWith("#")) {
      return `#${name}`;
    }

    if (line.includes(`#${name}`)) {
      return `#${name}`;
    }

    return name;
  }

  return null;
}

function isCommonKeyword(name: string): boolean {
  const keywords = new Set([
    "if",
    "for",
    "while",
    "switch",
    "catch",
    "return",
    "throw",
    "new",
    "typeof",
    "instanceof",
    "class",
    "interface",
    "type",
    "enum",
    "import",
    "export",
    "from",
    "default",
    "else",
    "case",
    "try",
    "finally",
    "do",
    "await",
    "delete",
    "void",
    "yield",
  ]);
  return keywords.has(name);
}

export interface FunctionHunk {
  name: string;
  lines: string[];
}

export function extractFunctionsFromDiff(diff: string): {
  functions: string[];
  hunks: FunctionHunk[];
} {
  const functions: string[] = [];
  const seen = new Set<string>();
  const hunks: FunctionHunk[] = [];

  let currentHunk: FunctionHunk | null = null;
  let currentContext: string | null = null;

  for (const rawLine of diff.split("\n")) {
    const hunkMatch = rawLine.match(HUNK_HEADER_RE);
    if (hunkMatch) {
      const context = hunkMatch[1]?.trim() ?? "";
      currentContext = context || null;

      const contextName = context ? extractFunctionName(context) : null;
      if (contextName && !seen.has(contextName)) {
        seen.add(contextName);
        functions.push(contextName);
      }

      if (contextName) {
        currentHunk = { name: contextName, lines: [] };
        hunks.push(currentHunk);
      } else {
        currentHunk = null;
      }
      continue;
    }

    if (!rawLine.startsWith("+") || rawLine.startsWith("+++")) {
      continue;
    }

    const addedLine = rawLine.slice(1);
    const name = extractFunctionName(addedLine);

    if (name && !seen.has(name)) {
      seen.add(name);
      functions.push(name);
      currentHunk = { name, lines: [addedLine] };
      hunks.push(currentHunk);
      continue;
    }

    if (currentHunk) {
      currentHunk.lines.push(addedLine);
      continue;
    }

    if (currentContext) {
      const contextName = extractFunctionName(currentContext);
      if (contextName) {
        const existing = hunks.find((hunk) => hunk.name === contextName);
        if (existing) {
          existing.lines.push(addedLine);
        } else {
          currentHunk = { name: contextName, lines: [addedLine] };
          hunks.push(currentHunk);
        }
      }
    }
  }

  return { functions, hunks };
}
