import { createHighlighter, type Highlighter } from "shiki";

const SUPPORTED_LANGS = [
  "typescript", "javascript", "jsx", "tsx",
  "python", "ruby", "go", "rust", "java", "c", "cpp",
  "csharp", "swift", "kotlin", "scala", "php",
  "html", "css", "scss", "less",
  "json", "yaml", "toml", "xml", "ini",
  "markdown", "bash", "shell", "sql",
  "graphql", "diff", "dockerfile",
  "lua", "elixir", "erlang", "clojure",
] as const;

const THEME = "rose-pine-moon";

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [THEME],
      langs: [...SUPPORTED_LANGS],
    });
  }
  return highlighterPromise;
}

export async function highlightCode(code: string, lang: string): Promise<string> {
  const highlighter = await getHighlighter();
  const normalized = (lang || "plaintext").toLowerCase();
  const language = (SUPPORTED_LANGS as readonly string[]).includes(normalized)
    ? normalized
    : "plaintext";
  try {
    return highlighter.codeToHtml(code, { lang: language, theme: THEME });
  } catch {
    return `<pre><code>${code.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] || c))}</code></pre>`;
  }
}
