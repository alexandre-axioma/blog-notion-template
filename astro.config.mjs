import { defineConfig } from "astro/config";

function getSiteUrl(fallback = "https://seu-blog.vercel.app") {
  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const vercelDeployment = process.env.VERCEL_URL?.trim();
  const raw = vercelProduction || vercelDeployment;

  if (!raw) return fallback;

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}

export default defineConfig({
  site: getSiteUrl(),
});
