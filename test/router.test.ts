import assert from "node:assert/strict";
import { test } from "node:test";
import { PathRouter } from "../src/router.ts";

test("static routes beat params, params beat wildcards", () => {
  const router = new PathRouter<string>();
  router.add("/*path", "wild");
  router.add("/users/:id", "user");
  router.add("/users/new", "create");
  assert.equal(router.match("/users/new")?.handler, "create");
  assert.deepEqual(router.match("/users/42"), {
    handler: "user",
    pattern: "/users/:id",
    params: { id: "42" },
  });
  assert.deepEqual(router.match("/files/a/b"), {
    handler: "wild",
    pattern: "/*path",
    params: { path: "files/a/b" },
  });
});

test("a trailing wildcard may capture nothing", () => {
  const router = new PathRouter<string>();
  router.add("/files/*path", "files");
  assert.deepEqual(router.match("/files")?.params, { path: "" });
  assert.deepEqual(router.match("/files/a/b")?.params, { path: "a/b" });
});

test("the root and a trailing slash", () => {
  const router = new PathRouter<string>();
  router.add("/", "home");
  router.add("/docs", "docs");
  assert.equal(router.match("/")?.handler, "home");
  assert.equal(router.match("/docs/")?.handler, "docs");
  assert.equal(router.match("/missing"), undefined);
});

test("equal scores keep the first registration", () => {
  const router = new PathRouter<string>();
  router.add("/a/:id", "first");
  router.add("/:name/b", "second");
  assert.equal(router.match("/a/b")?.handler, "first");
});

test("rejects bad patterns", () => {
  const router = new PathRouter<string>();
  assert.throws(() => router.add("users/:id", "x"));
  assert.throws(() => router.add("/a/*/b", "x"));
  assert.throws(() => router.add("/a/:id", "x") || router.add("/a/:id", "y"));
  assert.throws(() => router.match("/a?b=1"));
});
