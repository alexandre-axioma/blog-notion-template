import katex from "katex";
import { escapeHtml } from "./helpers";

/**
 * Render a LaTeX expression to HTML using KaTeX. Server-side, no JS shipped.
 * Falls back to a styled <code> if the expression is invalid.
 */
export function renderEquation(expression: string, displayMode: boolean = true): string {
  if (!expression) return "";
  try {
    return katex.renderToString(expression, {
      displayMode,
      throwOnError: false,
      output: "html",
      strict: "ignore",
    });
  } catch {
    return `<code class="math-fallback">${escapeHtml(expression)}</code>`;
  }
}
