import fs from "node:fs/promises";
import path from "node:path";

const IMAGE_DIR = path.join(process.cwd(), "public", "static", "notion");
const BUILD_IMAGE_DIR = path.join(process.cwd(), "dist", "static", "notion");
const FETCH_TIMEOUT_MS = 20000; // 20s — assets can be heavier than HTML

/**
 * Notion file URLs are signed S3 links that expire (~1h). At build time we
 * download the file once to public/static/notion/<id>.<ext> so the deployed
 * site keeps working long after the URL has expired.
 *
 * Used for any Notion-hosted file (image, video, audio, pdf, generic file).
 * External resources (already hosted somewhere stable) are returned as-is.
 */
export async function proxyAsset(url: string, blockId: string): Promise<string> {
  if (!url) return url;

  await fs.mkdir(IMAGE_DIR, { recursive: true });

  const id = assetId(blockId);
  const ext = guessExtension(url);
  const filename = `${id}${ext}`;
  const filePath = path.join(IMAGE_DIR, filename);
  const publicPath = `/static/notion/${filename}`;

  // Skip download if already cached
  try {
    await fs.access(filePath);
    await mirrorToBuildOutput(filePath, filename);
    return publicPath;
  } catch {
    // need to fetch
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(url, { signal: controller.signal, redirect: "follow" });
    clearTimeout(timer);
    if (!response.ok) {
      console.warn(`Image proxy: HTTP ${response.status} for ${url}`);
      return url;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    await mirrorToBuildOutput(filePath, filename);
    return publicPath;
  } catch (err) {
    console.warn(`Image proxy failed for ${url}:`, err);
    return url;
  }
}

async function mirrorToBuildOutput(filePath: string, filename: string): Promise<void> {
  try {
    await fs.access(path.join(process.cwd(), "dist"));
  } catch {
    return;
  }

  try {
    await fs.mkdir(BUILD_IMAGE_DIR, { recursive: true });
    await fs.copyFile(filePath, path.join(BUILD_IMAGE_DIR, filename));
  } catch (err) {
    console.warn(`Image proxy: failed to mirror ${filename} into dist:`, err);
  }
}

function assetId(value: string): string {
  return (
    value
      .replace(/-/g, "")
      .replace(/[^a-zA-Z0-9_]/g, "")
      .slice(0, 120) || "asset"
  );
}

function guessExtension(url: string): string {
  try {
    const u = new URL(url);
    const pathname = u.pathname.toLowerCase();
    const match = pathname.match(
      /\.(webp|png|jpe?g|gif|svg|avif|mp4|webm|mov|m4v|mp3|wav|ogg|m4a|pdf|zip)(?:$|[?#])/
    );
    if (match) return `.${match[1].replace("jpeg", "jpg")}`;
  } catch {
    // bad URL, fall through
  }
  return ".bin";
}

// Backwards-compatible alias
export const proxyImage = proxyAsset;
