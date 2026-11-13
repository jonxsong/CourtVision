import { cpSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const project = resolve(import.meta.dirname, "..");
const dist = resolve(project, "dist");

rmSync(dist, { recursive: true, force: true });
mkdirSync(resolve(dist, "server"), { recursive: true });
mkdirSync(resolve(dist, ".openai"), { recursive: true });
cpSync(resolve(project, "worker", "index.js"), resolve(dist, "server", "index.js"));
cpSync(resolve(project, "worker", "nba-snapshot.js"), resolve(dist, "server", "nba-snapshot.js"));
cpSync(resolve(project, ".openai", "hosting.json"), resolve(dist, ".openai", "hosting.json"));
console.log(`Built ${dist}`);
