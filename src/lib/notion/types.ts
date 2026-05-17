export type BlogImage = {
  src: string;
  alt: string;
};

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  status: string;
  summary: string;
  category: string;
  tags: string[];
  publishedAt: string | null;
  updatedAt: string | null;
  link: string | null;
  wordCount: number | null;
  seoScore: number | null;
  thumb?: BlogImage | null;
  hero?: BlogImage | null;
  cover?: BlogImage | null;
  /** URL da imagem hero (proporção 3:4 portrait) — null se não setada */
  heroImage: string | null;
  /** URL do thumb (proporção 4:3 landscape) — null se não setada */
  thumbImage: string | null;
  /** URL do cover (banner widescreen, do page cover do Notion) — null se não setada */
  coverImage: string | null;
  imageThumb?: string | null;
  imageBig?: string | null;
  html: string;
  toc: TocEntry[];
};

export type TocEntry = {
  id: string;
  text: string;
  level: 2 | 3;
};
