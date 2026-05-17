import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getPublishedPosts } from "@/lib/notion";
import { getSiteUrl } from "@/lib/site-url";

export const prerender = true;

export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();

  return rss({
    title: "Blog · Seu Nome",
    description: "Notas, ideias e tutoriais publicados a partir do Notion.",
    site: context.site ?? getSiteUrl(),
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
