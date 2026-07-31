import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist/client", { recursive: true });
await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai/drizzle", { recursive: true });

await cp("app", "dist/client", { recursive: true });
await cp("worker/site-worker.js", "dist/server/index.js");
await cp("worker/leaderboard.js", "dist/server/leaderboard.js");
await cp(".openai/hosting.json", "dist/.openai/hosting.json");
await cp("db/migrations", "dist/.openai/drizzle", { recursive: true });
