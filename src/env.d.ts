/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly VERCEL_PROJECT_PRODUCTION_URL?: string;
  readonly VERCEL_URL?: string;
  readonly NOTION_TOKEN?: string;
  readonly NOTION_BLOG_DATABASE_ID?: string;
  readonly VERCEL_DEPLOY_HOOK_URL?: string;
  readonly NOTION_WEBHOOK_VERIFICATION_TOKEN?: string;
  readonly SEO_AUDIT_SECRET?: string;
  readonly PAGESPEED_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
