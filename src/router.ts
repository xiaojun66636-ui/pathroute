type Segment =
  | { kind: "static"; value: string }
  | { kind: "param"; name: string }
  | { kind: "wild"; name: string };

type Stored<T> = {
  pattern: string;
  segments: Segment[];
  score: number;
  index: number;
  handler: T;
};

export type RouteMatch<T> = {
  handler: T;
  pattern: string;
  params: Record<string, string>;
};

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Path router. Static segments outrank `:params`, which outrank a trailing
 * `*wildcard`. Ties keep the earlier registration.
 * The caller strips the query string and hash. No decoding is done.
 */
export class PathRouter<T> {
  private readonly routes: Stored<T>[] = [];

  add(pattern: string, handler: T): void {
    if (this.routes.some((route) => route.pattern === pattern)) {
      throw new Error(`pattern already registered: ${pattern}`);
    }
    const segments = parsePattern(pattern);
    this.routes.push({
      pattern,
      segments,
      score: scoreOf(segments),
      index: this.routes.length,
      handler,
    });
  }

  match(path: string): RouteMatch<T> | undefined {
    const parts = splitPath(path);
    let best: { route: Stored<T>; params: Record<string, string> } | undefined;
    for (const route of this.routes) {
      const params = matchSegments(route.segments, parts);
      if (!params) continue;
      if (
        !best ||
        route.score > best.route.score ||
        (route.score === best.route.score && route.index < best.route.index)
      ) {
        best = { route, params };
      }
    }
    if (!best) return undefined;
    return { handler: best.route.handler, pattern: best.route.pattern, params: best.params };
  }
}

function parsePattern(pattern: string): Segment[] {
  if (!pattern.startsWith("/")) throw new Error("pattern must start with /");
  const parts = splitPath(pattern);
  return parts.map((part, index) => {
    if (part.startsWith("*")) {
      if (index !== parts.length - 1) throw new Error("wildcard must be the last segment");
      const name = part.slice(1);
      if (!NAME.test(name)) throw new Error(`bad wildcard name: ${part}`);
      return { kind: "wild", name };
    }
    if (part.startsWith(":")) {
      const name = part.slice(1);
      if (!NAME.test(name)) throw new Error(`bad param name: ${part}`);
      return { kind: "param", name };
    }
    if (part.includes("*") || part.includes(":")) {
      throw new Error(`static segment cannot contain : or *: ${part}`);
    }
    return { kind: "static", value: part };
  });
}

function scoreOf(segments: readonly Segment[]): number {
  let score = 0;
  for (const segment of segments) {
    if (segment.kind === "static") score += 2;
    else if (segment.kind === "param") score += 1;
  }
  return score;
}

function splitPath(path: string): string[] {
  if (!path.startsWith("/")) throw new Error("path must start with /");
  if (path.includes("?") || path.includes("#")) {
    throw new Error("strip the query string and hash before matching");
  }
  const trimmed = path.length > 1 ? path.replace(/\/+$/, "") : path;
  if (trimmed === "/") return [];
  const parts = trimmed.split("/").slice(1);
  if (parts.some((part) => part.length === 0)) {
    throw new Error("path has an empty segment");
  }
  return parts;
}

function matchSegments(
  segments: readonly Segment[],
  parts: readonly string[],
): Record<string, string> | undefined {
  const params: Record<string, string> = {};
  let index = 0;
  for (const segment of segments) {
    if (segment.kind === "wild") {
      params[segment.name] = parts.slice(index).join("/");
      return params;
    }
    const part = parts[index];
    if (part === undefined) return undefined;
    if (segment.kind === "static") {
      if (part !== segment.value) return undefined;
    } else {
      params[segment.name] = part;
    }
    index += 1;
  }
  if (index !== parts.length) return undefined;
  return params;
}
