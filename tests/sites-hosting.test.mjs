import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const { default: worker } = await import("../dist/server/index.js");

test("serves app/index.html unchanged at the site root", async () => {
  let requestedPath;
  const response = await worker.fetch(
    new Request("https://rack-five.example/"),
    {
      ASSETS: {
        async fetch(request) {
          requestedPath = new URL(request.url).pathname;
          return new Response(await readFile("dist/client/index.html"), {
            headers: { "content-type": "text/html; charset=utf-8" },
          });
        },
      },
    },
  );

  assert.equal(requestedPath, "/index.html");
  assert.equal(response.status, 200);
  assert.equal(await response.text(), await readFile("app/index.html", "utf8"));
});

test("passes asset requests through without rewriting them", async () => {
  let requestedPath;
  await worker.fetch(new Request("https://rack-five.example/src/main.js"), {
    ASSETS: {
      async fetch(request) {
        requestedPath = new URL(request.url).pathname;
        return new Response("ok");
      },
    },
  });

  assert.equal(requestedPath, "/src/main.js");
});

