import { Client } from "@notionhq/client";
import { createHash } from "node:crypto";
import type { BlogImage, BlogPost } from "./types";
import { renderBlocks } from "./render";
import { tocFromBlocks } from "./toc";
import { slugify } from "./helpers";
import { proxyAsset } from "./images";

const notionToken = (import.meta as any).env?.NOTION_TOKEN ?? process.env.NOTION_TOKEN;
const databaseId =
  (import.meta as any).env?.NOTION_BLOG_DATABASE_ID ?? process.env.NOTION_BLOG_DATABASE_ID;

const notion = notionToken ? new Client({ auth: notionToken }) : null;

const properties = {
  title: ["Titulo", "Title"],
  slug: ["Slug"],
  status: ["Status"],
  summary: ["Resumo do Conteúdo", "Resumo do Conteudo", "Content Brief"],
  category: ["Categoria", "Category"],
  tags: ["Tags"],
  publishedAt: ["Data de Publicação", "Data de Publicacao", "Publish Date"],
  updatedAt: ["Última Modificação", "Ultima Modificacao", "Last Updated"],
  link: ["Link"],
  wordCount: ["Quantidade de Palavras", "Word Count"],
  seoScore: ["SEO Score"],
  hero: ["Hero", "Imagem destaque"],
  thumb: ["Thumb", "Imagem lista", "Thumbnail"],
};

const publishedStatuses = new Set(["published", "publicado", "publish"]);
const scheduledStatuses = new Set(["scheduled", "programado"]);

/**
 * Wraps a Notion API call with retry + exponential backoff. The Notion API
 * has tight rate limits and occasional flakiness; retrying once or twice is
 * enough to make the build resilient without masking real failures.
 */
async function withRetry<T>(fn: () => Promise<T>, label: string, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        const delay = 1000 * (attempt + 1);
        console.warn(`Notion API ${label} failed (attempt ${attempt + 1}/${retries + 1}); retrying in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

export async function getPublishedPosts(): Promise<BlogPost[]> {
  if (!notion || !databaseId) {
    console.warn("Notion env vars are missing. Returning an empty blog.");
    return [];
  }

  const pages = await withRetry(
    () =>
      notion!.databases.query({
        database_id: databaseId!,
        page_size: 100,
      }),
    "databases.query",
  ).catch((error) => {
    throw explainNotionDatabaseError(error);
  });

  const publishedPages = pages.results.filter((page: any) =>
    shouldPublishPage(page.properties ?? {})
  );

  const posts = await Promise.all(publishedPages.map((p: any) => pageToPost(p)));

  return posts.sort((a, b) => {
    const aDate = a.publishedAt ?? "";
    const bDate = b.publishedAt ?? "";
    return bDate.localeCompare(aDate);
  });
}

export async function getAllPostPaths() {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

function explainNotionDatabaseError(error: any): Error {
  if (error?.code === "object_not_found") {
    return new Error(
      [
        `Could not read the Notion database "${databaseId}".`,
        "Check two things:",
        '1. In your Notion integration, open Content access -> Edit access and select the duplicated "Blog Notion Template" page or the "Blog Content Management" database.',
        '2. In Vercel, NOTION_BLOG_DATABASE_ID must be the ID of the "Blog Content Management" database, not the dashboard page.',
      ].join("\n"),
    );
  }

  return error instanceof Error ? error : new Error(String(error));
}

async function pageToPost(page: any): Promise<BlogPost> {
  const pageProperties = page.properties ?? {};
  const title =
    plainTitle(getProperty(pageProperties, properties.title)) || "Sem titulo";
  const explicitSlug = plainRichText(getProperty(pageProperties, properties.slug));
  const slug = explicitSlug ? slugify(explicitSlug) : slugify(title);

  const blocks = await getAllBlockChildren(page.id);
  const html = await renderBlocks(blocks, getAllBlockChildren);
  const toc = tocFromBlocks(blocks);
  const thumb = await propertyFileImage(
    getProperty(pageProperties, properties.thumb),
    page.id,
    "thumb",
    `Thumb de ${title}`,
  );
  const hero = await propertyFileImage(
    getProperty(pageProperties, properties.hero),
    page.id,
    "hero",
    `Imagem principal de ${title}`,
  );
  const cover = await pageCoverImage(page.cover, page.id, `Cover de ${title}`);
  const thumbImage = thumb?.src ?? null;
  const heroImage = hero?.src ?? null;
  const coverImage = cover?.src ?? null;

  return {
    id: page.id,
    title,
    slug,
    status: getProperty(pageProperties, properties.status)?.status?.name ?? "",
    summary: plainRichText(getProperty(pageProperties, properties.summary)),
    category: getProperty(pageProperties, properties.category)?.select?.name ?? "",
    tags:
      getProperty(pageProperties, properties.tags)?.multi_select?.map(
        (tag: any) => tag.name,
      ) ?? [],
    publishedAt: propertyDate(getProperty(pageProperties, properties.publishedAt)),
    updatedAt: propertyDate(getProperty(pageProperties, properties.updatedAt)),
    link: getProperty(pageProperties, properties.link)?.url ?? null,
    wordCount: getProperty(pageProperties, properties.wordCount)?.number ?? null,
    seoScore: getProperty(pageProperties, properties.seoScore)?.number ?? null,
    thumb,
    hero,
    cover,
    thumbImage,
    heroImage,
    coverImage,
    imageThumb: thumbImage ?? coverImage ?? heroImage,
    imageBig: heroImage ?? coverImage ?? thumbImage,
    html,
    toc,
  };
}

export async function getAllBlockChildren(blockId: string): Promise<any[]> {
  if (!notion) return [];
  const blocks: any[] = [];
  let cursor: string | undefined;
  do {
    const response = await withRetry(
      () =>
        notion!.blocks.children.list({
          block_id: blockId,
          page_size: 100,
          start_cursor: cursor,
        }),
      `blocks.children.list(${blockId.slice(0, 8)})`,
    );
    blocks.push(...response.results);
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return blocks;
}

export function categoriesFrom(posts: BlogPost[]): string[] {
  const set = new Set<string>();
  for (const post of posts) {
    if (post.category) set.add(post.category);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function tagsFrom(posts: BlogPost[]): string[] {
  const set = new Set<string>();
  for (const post of posts) {
    for (const tag of post.tags) set.add(tag);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function plainTitle(property: any): string {
  return property?.title?.map((item: any) => item.plain_text).join("") ?? "";
}

function plainRichText(property: any): string {
  return property?.rich_text?.map((item: any) => item.plain_text).join("") ?? "";
}

async function propertyFileImage(
  property: any,
  pageId: string,
  kind: "thumb" | "hero",
  fallbackAlt: string,
): Promise<BlogImage | null> {
  const file = property?.type === "files" ? property.files?.[0] : null;
  if (!file) return null;
  const url = file.type === "file" ? file.file?.url : file.external?.url;
  if (!url) return null;

  const src = file.type === "file"
    ? await proxyAsset(url, assetKey(pageId, kind, url))
    : url;

  return {
    src,
    alt: file.name || fallbackAlt,
  };
}

async function pageCoverImage(
  cover: any,
  pageId: string,
  fallbackAlt: string,
): Promise<BlogImage | null> {
  if (!cover) return null;
  const url = cover.type === "file" ? cover.file?.url : cover.external?.url;
  if (!url) return null;

  const src = cover.type === "file"
    ? await proxyAsset(url, assetKey(pageId, "cover", url))
    : url;

  return {
    src,
    alt: fallbackAlt,
  };
}

function assetKey(pageId: string, kind: "thumb" | "hero" | "cover", url: string): string {
  return `${pageId}-${kind}-${assetFingerprint(url)}`;
}

function assetFingerprint(url: string): string {
  try {
    const parsed = new URL(url);
    return createHash("sha1")
      .update(`${parsed.origin}${parsed.pathname}`)
      .digest("hex")
      .slice(0, 12);
  } catch {
    return createHash("sha1").update(url).digest("hex").slice(0, 12);
  }
}

function propertyDate(property: any): string | null {
  if (!property) return null;
  if (property.type === "last_edited_time") {
    return property.last_edited_time ?? null;
  }
  return property.date?.start ?? null;
}

function getProperty(pageProperties: Record<string, any>, names: string[]): any {
  for (const name of names) {
    if (pageProperties[name]) return pageProperties[name];
  }
  return null;
}

function shouldPublishPage(pageProperties: Record<string, any>): boolean {
  const status =
    getProperty(pageProperties, properties.status)?.status?.name?.toLowerCase() ?? "";
  if (publishedStatuses.has(status)) return true;
  if (!scheduledStatuses.has(status)) return false;
  return isPublishDateDue(getProperty(pageProperties, properties.publishedAt));
}

function isPublishDateDue(dateProperty: any): boolean {
  const start = dateProperty?.date?.start;
  if (!start) return false;
  return new Date(start).getTime() <= Date.now();
}
