import { cpSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const source = resolve("apps/web/out");
const destination = resolve("out");

if (!existsSync(source)) {
  throw new Error(`Missing static export at ${source}`);
}

rmSync(destination, { recursive: true, force: true });
cpSync(source, destination, { recursive: true });

console.log(`Prepared Sites artifact at ${destination}`);
