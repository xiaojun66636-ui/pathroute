# pathroute

A path router with an explicit precedence rule. No dependencies.

When two patterns match, the one with the higher score wins. A static segment scores 2, a `:param` scores 1, a trailing `*wildcard` scores 0. The same score keeps the pattern that was registered first.

So `/users/new` beats `/users/:id`, and `/users/:id` beats `/*path`.

## Use

```ts
import { PathRouter } from "./src/router.ts";

const router = new PathRouter<string>();
router.add("/users/new", "create");
router.add("/users/:id", "show");
router.add("/files/*path", "files");

router.match("/users/42");
// { handler: "show", pattern: "/users/:id", params: { id: "42" } }
```

Strip `?query` and `#hash` before calling `match`. Nothing is decoded. A wildcard has to be the last segment, and it may capture an empty string, so `/files/*path` matches `/files`.

## Test

```bash
node --experimental-strip-types --test test/*.test.ts
```

## License

MIT
