import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getPublishedPosts } from "@/lib/notion";

export const prerender = true;

export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();

  return rss({
    title: "Blog · Seu Nome",
    description: "Notas, ideias e tutoriais publicados a partir do Notion.",
    site: context.site ?? import.meta.env.PUBLIC_SITE_URL ?? "https://seu-blog.vercel.app",
    items: posts.map((post) => ({
      title: post.title,
      pubDate: post.publishedAt ? new Date(post.publishedAt) : new Date(),
      description: post.summary || "",
      link: `/${post.slug}/`,
      content: post.html,
    })),
    customData: "<language>pt-BR</language>",
  });
}
