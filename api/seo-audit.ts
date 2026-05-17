import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Client } from "@notionhq/client";
import { getSiteUrl } from "../src/lib/site-url.js";

const siteUrl = getSiteUrl();
const publishedStatuses = new Set(["published", "publicado", "publish"]);
const scheduledStatuses = new Set(["scheduled", "programado"]);

const properties = {
  title: ["Titulo", "Title"],
  slug: ["Slug"],
  status: ["Status"],
  publishedAt: ["Data de Publicação", "Data de Publicacao", "Publish Date"],
  seoScore: ["SEO Score"],
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (!["GET", "POST"].includes(request.method ?? "")) {
    response.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  if (!isAuthorized(request)) {
    response.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  const notionToken = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_BLOG_DATABASE_ID;

  if (!notionToken || !databaseId) {
    response.status(500).json({ ok: false, error: "Missing Notion environment variables" });
    return;
  }

  const notion = new Client({ auth: notionToken });
  const pages = await notion.databases.query({
    database_id: databaseId,
    page_size: 100,
  });

  const publishedPages = pages.results.filter((page: any) => shouldAuditPage(page.properties ?? {}));
  const results = [];

  for (const page of publishedPages as any[]) {
    const pageProperties = page.properties ?? {};
    const title = plainTitle(getProperty(pageProperties, properties.title)) || page.id;
    const slug = getSlug(pageProperties, title);
    const url = `${siteUrl}/${slug}/`;
    const seoScore = await getPageSpeedSeoScore(url);

    await notion.pages.update({
      page_id: page.id,
      properties: {
        "SEO Score": {
          number: seoScore,
        },
      },
    });

    results.push({
      id: page.id,
      title,
      url,
      seoScore,
    });
  }

  response.status(200).json({
    ok: true,
    audited: results.length,
    results,
  });
}

function shouldAuditPage(pageProperties: Record<string, any>): boolean {
  return shouldPublishPage(pageProperties) && !hasSeoScore(pageProperties);
}

function isAuthorized(request: VercelRequest): boolean {
  const secret = process.env.SEO_AUDIT_SECRET;

  if (!secret) {
    return false;
  }

  const authHeader = request.headers.authorization;
  return authHeader === `Bearer ${secret}`;
}

async function getPageSpeedSeoScore(url: string): Promise<number> {
  const params = new URLSearchParams({
    url,
    category: "SEO",
    strategy: "mobile",
  });

  if (process.env.PAGESPEED_API_KEY) {
    params.set("key", process.env.PAGESPEED_API_KEY);
  }

  const response = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`);

  if (!response.ok) {
    throw new Error(`PageSpeed Insights failed for ${url}: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const score = data?.lighthouseResult?.categories?.seo?.score;

  if (typeof score !== "number") {
    throw new Error(`PageSpeed Insights did not return an SEO score for ${url}`);
  }

  return Math.round(score * 100);
}

function shouldPublishPage(pageProperties: Record<string, any>): boolean {
  const status = getProperty(pageProperties, properties.status)?.status?.name?.toLowerCase() ?? "";

  if (publishedStatuses.has(status)) {
    return true;
  }

  if (!scheduledStatuses.has(status)) {
    return false;
  }

  return isPublishDateDue(getProperty(pageProperties, properties.publishedAt));
}

function hasSeoScore(pageProperties: Record<string, any>): boolean {
  const score = getProperty(pageProperties, properties.seoScore)?.number;

  return typeof score === "number";
}

function isPublishDateDue(dateProperty: any): boolean {
  const start = dateProperty?.date?.start;

  if (!start) {
    return false;
  }

  return new Date(start).getTime() <= Date.now();
}

function getSlug(pageProperties: Record<string, any>, title: string): string {
  const explicitSlug = plainRichText(getProperty(pageProperties, properties.slug));

  return explicitSlug ? slugify(explicitSlug) : slugify(title);
}

function getProperty(pageProperties: Record<string, any>, names: string[]): any {
  for (const name of names) {
    if (pageProperties[name]) {
      return pageProperties[name];
    }
  }

  return null;
}

function plainTitle(property: any): string {
  return property?.title?.map((item: any) => item.plain_text).join("") ?? "";
}

function plainRichText(property: any): string {
  return property?.rich_text?.map((item: any) => item.plain_text).join("") ?? "";
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
