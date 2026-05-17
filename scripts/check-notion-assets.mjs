import fs from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve("dist");
const blockedPatterns = [
  "prod-files-secure.s3",
  "X-Amz-Algorithm",
  "X-Amz-Credential",
  "X-Amz-Expires",
  "X-Amz-Signature",
];
const textExtensions = new Set([".html", ".js", ".json", ".xml", ".txt"]);

const offenders = [];

async function walk(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err?.code === "ENOENT") return;
    throw err;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }
    if (!textExtensions.has(path.extname(entry.name))) continue;

    const content = await fs.readFile(fullPath, "utf8");
    for (const pattern of blockedPatterns) {
      if (content.includes(pattern)) {
        offenders.push(`${path.relative(process.cwd(), fullPath)} contains ${pattern}`);
      }
    }
  }
}

await walk(distDir);

if (offenders.length > 0) {
  console.error("Notion temporary asset URLs leaked into the production build:");
  for (const offender of offenders) {
    console.error(`- ${offender}`);
  }
  process.exit(1);
}
