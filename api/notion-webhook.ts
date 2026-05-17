import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Client } from "@notionhq/client";

const publishedStatuses = new Set(["published", "publicado", "publish"]);
const scheduledStatuses = new Set(["scheduled", "programado"]);
const statusPropertyNames = ["Status"];
const publishDatePropertyNames = ["Data de Publicação", "Data de Publicacao", "Publish Date"];

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "POST") {
    response.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const body = JSON.stringify(request.body ?? {});
  const verificationToken =
    request.body?.verification_token ??
    request.body?.verificationToken;

  if (verificationToken) {
    // Notion sends a verification token only once during webhook setup.
    // Logging it here lets you copy it from Vercel function logs into
    // NOTION_WEBHOOK_VERIFICATION_TOKEN. After setup this branch never
    // fires, so the token isn't leaked on each webhook delivery.
    console.log("Notion webhook verification token:", verificationToken);
    response.status(200).json({
      ok: true,
      verification_token: verificationToken,
    });
    return;
  }

  const notionWebhookToken = process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN;
  const signature = request.headers["x-notion-signature"];

  if (notionWebhookToken) {
    if (typeof signature !== "string" || !isValidSignature(body, signature, notionWebhookToken)) {
      response.status(401).json({ ok: false, error: "Invalid Notion signature" });
      return;
    }
  }

  const events = getWebhookEvents(request.body);
  console.log(
    "Notion webhook events received:",
    events.map((event) => event?.type ?? "unknown").join(", ")
  );

  const shouldDeploy = await shouldTriggerDeploy(events);

  if (!shouldDeploy) {
    response.status(200).json({ ok: true, deployTriggered: false, skipped: true });
    return;
  }

  const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;

  if (!deployHookUrl) {
    console.warn("VERCEL_DEPLOY_HOOK_URL is missing. Webhook received, but deploy was not triggered.");
    response.status(200).json({ ok: true, deployTriggered: false });
    return;
  }

  const deployResponse = await fetch(deployHookUrl, { method: "POST" });

  if (!deployResponse.ok) {
    console.warn("Deploy hook failed:", deployResponse.status, await deployResponse.text());
  }

  response.status(200).json({
    ok: true,
    deployTriggered: deployResponse.ok,
    status: deployResponse.status,
  });
}

function getWebhookEvents(payload: any): any[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.events)) {
    return payload.events;
  }

  return [payload];
}

async function shouldTriggerDeploy(events: any[]): Promise<boolean> {
  for (const event of events) {
    if (await shouldTriggerDeployForEvent(event)) {
      return true;
    }
  }

  return false;
}

async function shouldTriggerDeployForEvent(payload: any): Promise<boolean> {
  const eventType = payload?.type;

  if (eventType === "page.deleted") {
    return true;
  }

  if (!["page.content_updated", "page.properties_updated", "page.created"].includes(eventType)) {
    console.log("Skipping Notion webhook event with unsupported type:", eventType ?? "unknown");
    return false;
  }

  if (eventType === "page.content_updated") {
    console.log("Skipping page.content_updated to avoid deploys on Notion autosave.");
    return false;
  }

  const pageId = payload?.entity?.type === "page" ? payload.entity.id : null;

  if (!pageId) {
    console.log("Skipping Notion webhook event without a page entity.");
    return false;
  }

  const page = await retrieveNotionPage(pageId);

  if (!page) {
    console.log("Skipping Notion webhook event because the page could not be retrieved.");
    return false;
  }

  if (!isBlogPage(page)) {
    console.log("Skipping Notion webhook event because the page is not part of the configured blog database.");
    return false;
  }

  if (eventType === "page.properties_updated") {
    console.log("Triggering deploy for page.properties_updated.");
    return true;
  }

  const shouldPublish = shouldPublishPage(page.properties ?? {});

  console.log("Page created webhook publish check:", shouldPublish ? "published" : "not published");

  return shouldPublish;
}

async function retrieveNotionPage(pageId: string): Promise<any | null> {
  const notionToken = process.env.NOTION_TOKEN;

  if (!notionToken) {
    console.warn("NOTION_TOKEN is missing. Skipping webhook-triggered deploy.");
    return null;
  }

  try {
    const notion = new Client({ auth: notionToken });
    return await notion.pages.retrieve({ page_id: pageId });
  } catch (error) {
    console.warn("Unable to retrieve Notion page for webhook event:", error);
    return null;
  }
}

function isBlogPage(page: any): boolean {
  const databaseId = normalizeId(process.env.NOTION_BLOG_DATABASE_ID ?? "");
  const parentIds = [
    page?.parent?.database_id,
    page?.parent?.data_source_id,
  ]
    .filter(Boolean)
    .map((value) => normalizeId(String(value)));

  return Boolean(databaseId && parentIds.includes(databaseId));
}

function isValidSignature(body: string, signature: string, verificationToken: string): boolean {
  const calculatedSignature = `sha256=${createHmac("sha256", verificationToken).update(body).digest("hex")}`;

  try {
    return timingSafeEqual(Buffer.from(calculatedSignature), Buffer.from(signature));
  } catch {
    return false;
  }
}

function normalizeId(value: string): string {
  return value.replace(/-/g, "").toLowerCase();
}

function getProperty(pageProperties: Record<string, any>, names: string[]): any {
  for (const name of names) {
    if (pageProperties[name]) {
      return pageProperties[name];
    }
  }

  return null;
}

function shouldPublishPage(pageProperties: Record<string, any>): boolean {
  const status = getProperty(pageProperties, statusPropertyNames)?.status?.name?.toLowerCase() ?? "";

  if (publishedStatuses.has(status)) {
    return true;
  }

  if (!scheduledStatuses.has(status)) {
    return false;
  }

  return isPublishDateDue(getProperty(pageProperties, publishDatePropertyNames));
}

function isPublishDateDue(dateProperty: any): boolean {
  const start = dateProperty?.date?.start;

  if (!start) {
    return false;
  }

  return new Date(start).getTime() <= Date.now();
}
