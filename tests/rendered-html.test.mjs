import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("keeps the existing saved-route storage contract", async () => {
  const source = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /const FAVORITES_STORAGE_KEY = "elagin-festival-route:v1";/,
  );
  assert.match(source, /JSON\.stringify\(favoriteKeys\)/);
  assert.match(
    source,
    /\.\.\.new Set\(\[\.\.\.favoriteKeys,\s*\.\.\.sanitizeRouteKeys\(keys\)\]\)/,
  );
  assert.match(source, /const SHARED_ROUTE_HASH_PREFIX = "#route=v1\.";/);
});

test("opens route sharing as a QR dialog", async () => {
  const source = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /setShareDialogOpen\(true\)/);
  assert.match(source, /<QRCodeSVG/);
  assert.match(source, /Поделиться через приложения/);
  assert.match(source, /new URL\(window\.location\.href\)/);
  assert.match(source, /new URL\(shareUrl\)\.host/);
  assert.doesNotMatch(source, /<span>festival-theatre-guide…<\/span>/);
});
