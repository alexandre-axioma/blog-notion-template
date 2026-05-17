import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { escapeAttribute, escapeHtml, safeUrl } from "./helpers";

const OG_CACHE_DIR = path.join(process.cwd(), ".notion-cache", "og");
const FETCH_TIMEOUT_MS = 5000;

type OgData = {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
};

/**
 * Match a URL to a known provider and return rich embed HTML. Falls back
 * to a rich bookmark card (with OG metadata fetched at build time).
 */
export async function renderEmbedUrl(url: string, captionHtml: string = ""): Promise<string> {
  if (!url) return "";

  const providerHtml = matchProvider(url);
  const caption = captionHtml ? `<figcaption>${captionHtml}</figcaption>` : "";

  if (providerHtml) {
    return `<figure class="embed">${providerHtml}${caption}</figure>`;
  }

  return `<figure class="embed">${await renderBookmark(url)}${caption}</figure>`;
}

function matchProvider(url: string): string | null {
  // YouTube
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  if (yt) {
    return `<div class="embed__frame embed__frame--16-9">
      <iframe src="https://www.youtube.com/embed/${yt[1]}" title="YouTube" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    </div>`;
  }

  // Vimeo
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) {
    return `<div class="embed__frame embed__frame--16-9">
      <iframe src="https://player.vimeo.com/video/${vimeo[1]}" title="Vimeo" loading="lazy" allowfullscreen></iframe>
    </div>`;
  }

  // Loom
  const loom = url.match(/loom\.com\/share\/([\w-]+)/);
  if (loom) {
    return `<div class="embed__frame embed__frame--16-9">
      <iframe src="https://www.loom.com/embed/${loom[1]}" title="Loom" loading="lazy" allowfullscreen></iframe>
    </div>`;
  }

  // Twitter / X — link card (full embed needs widget JS)
  const tweet = url.match(/(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/);
  if (tweet) {
    return `<a class="embed__card embed__card--twitter" href="${escapeAttribute(url)}" rel="noopener noreferrer" target="_blank">
      <span class="embed__provider">Twitter / X</span>
      <span class="embed__title">@${escapeHtml(tweet[1])} · ${escapeHtml(url)}</span>
    </a>`;
  }

  // GitHub Gist — uses official embed script
  if (/gist\.github\.com\//.test(url)) {
    const cleaned = url.replace(/\.js$/, "");
    return `<div class="embed__gist"><script src="${escapeAttribute(cleaned + ".js")}" async></script></div>`;
  }

  // CodePen
  const pen = url.match(/codepen\.io\/([\w-]+)\/pen\/([\w-]+)/);
  if (pen) {
    return `<div class="embed__frame embed__frame--4-3">
      <iframe src="https://codepen.io/${pen[1]}/embed/${pen[2]}?default-tab=result" title="CodePen" loading="lazy"></iframe>
    </div>`;
  }

  // Spotify
  const spotify = url.match(/open\.spotify\.com\/(track|episode|album|playlist)\/([\w]+)/);
  if (spotify) {
    return `<div class="embed__frame embed__frame--spotify">
      <iframe src="https://open.spotify.com/embed/${spotify[1]}/${spotify[2]}" title="Spotify" loading="lazy" allow="encrypted-media"></iframe>
    </div>`;
  }

  return null;
}

async function renderBookmark(url: string): Promise<string> {
  const safeHref = safeUrl(url);
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // ignore
  }

  const og = await fetchOgData(url);
  const hasRichData = !!(og.title || og.description || og.image);

  // Bare fallback if no OG could be extracted
  if (!hasRichData) {
    return `<a class="embed__card embed__card--bookmark" href="${escapeAttribute(safeHref)}" rel="noopener noreferrer" target="_blank">
      <span class="embed__provider">${escapeHtml(host)}</span>
      <span class="embed__title">${escapeHtml(url)}</span>
    </a>`;
  }

  const title = og.title || og.siteName || host;
  const description = og.description || "";
  const faviconHtml = og.favicon
    ? `<img class="embed__card-favicon" src="${escapeAttribute(safeUrl(og.favicon))}" alt="" loading="lazy" decoding="async" />`
    : "";
  const imageHtml = og.image
    ? `<div class="embed__card-thumb"><img src="${escapeAttribute(safeUrl(og.image))}" alt="" loading="lazy" decoding="async" /></div>`
    : "";

  return `<a class="embed__card embed__card--rich" href="${escapeAttribute(safeHref)}" rel="noopener noreferrer" target="_blank">
    <div class="embed__card-info">
      <span class="embed__card-title">${escapeHtml(title)}</span>
      ${description ? `<span class="embed__card-desc">${escapeHtml(description)}</span>` : ""}
      <span class="embed__card-meta">
        ${faviconHtml}
        <span class="embed__card-host">${escapeHtml(host)}</span>
      </span>
    </div>
    ${imageHtml}
  </a>`;
}

/**
 * Fetch Open Graph metadata for a URL. Cached in .notion-cache/og/
 * so subsequent builds don't re-fetch. Handles timeouts and failures
 * by returning an empty result.
 */
async function fetchOgData(url: string): Promise<OgData> {
  if (!url) return {};
  const hash = crypto.createHash("md5").update(url).digest("hex");
  const cachePath = path.join(OG_CACHE_DIR, `${hash}.json`);

  try {
    const cached = await fs.readFile(cachePath, "utf-8");
    return JSON.parse(cached);
  } catch {
    // not cached
  }

  let data: OgData = {};
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          `Mozilla/5.0 (compatible; NotionAstroBlogStarter/1.0; +${process.env.PUBLIC_SITE_URL ?? "https://seu-blog.vercel.app"})`,
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timer);

    if (response.ok) {
      const html = await response.text();
      data = parseOg(html, url);
    }
  } catch {
    // ignore — empty result will still be cached
  }

  try {
    await fs.mkdir(OG_CACHE_DIR, { recursive: true });
    await fs.writeFile(cachePath, JSON.stringify(data));
  } catch {
    // ignore cache write errors
  }

  return data;
}

function parseOg(html: string, sourceUrl: string): OgData {
  const data: OgData = {};

  const ogTitle =
    metaContent(html, /property=["']og:title["']/) ||
    metaContent(html, /name=["']twitter:title["']/);
  if (ogTitle) data.title = decodeEntities(ogTitle);
  else {
    const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (t) data.title = decodeEntities(t[1].trim());
  }

  const ogDesc =
    metaContent(html, /property=["']og:description["']/) ||
    metaContent(html, /name=["']description["']/) ||
    metaContent(html, /name=["']twitter:description["']/);
  if (ogDesc) data.description = decodeEntities(ogDesc);

  const ogImage =
    metaContent(html, /property=["']og:image["']/) ||
    metaContent(html, /name=["']twitter:image["']/);
  if (ogImage) data.image = resolveUrl(ogImage, sourceUrl);

  const ogSite = metaContent(html, /property=["']og:site_name["']/);
  if (ogSite) data.siteName = decodeEntities(ogSite);

  try {
    data.favicon = `https://www.google.com/s2/favicons?domain=${new URL(sourceUrl).hostname}&sz=64`;
  } catch {
    // ignore
  }

  return data;
}

function metaContent(html: string, attrPattern: RegExp): string | undefined {
  // Tries both attribute orderings (content first or property first)
  const source = attrPattern.source;
  const flags = attrPattern.flags.includes("i") ? "i" : "i";

  const reAfter = new RegExp(
    `<meta[^>]*${source}[^>]*content=["']([^"']+)["']`,
    flags
  );
  const reBefore = new RegExp(
    `<meta[^>]*content=["']([^"']+)["'][^>]*${source}`,
    flags
  );

  const m1 = html.match(reAfter);
  if (m1) return m1[1];
  const m2 = html.match(reBefore);
  if (m2) return m2[1];
  return undefined;
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function resolveUrl(maybeRelative: string, base: string): string {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return maybeRelative;
  }
}
