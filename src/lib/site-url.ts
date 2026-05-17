export function getSiteUrl(fallback = "https://seu-blog.vercel.app"): string {
  const explicit = process.env.PUBLIC_SITE_URL?.trim();
  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const vercelDeployment = process.env.VERCEL_URL?.trim();
  const raw = explicit || vercelProduction || vercelDeployment;

  if (!raw) return fallback;

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}
