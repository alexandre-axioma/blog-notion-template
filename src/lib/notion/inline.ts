import { escapeAttribute, escapeHtml, safeUrl } from "./helpers";
import { renderEquation } from "./math";

/**
 * Render an array of Notion rich_text items to HTML with annotations,
 * colors, mentions, links and inline equations.
 */
export function richText(items: any[] = []): string {
  return items.map(renderInlineItem).join("");
}

function renderInlineItem(item: any): string {
  if (!item) return "";

  if (item.type === "mention") return renderMention(item);
  if (item.type === "equation") {
    return `<span class="math-inline">${renderEquation(item.equation?.expression ?? "", false)}</span>`;
  }

  let value = escapeHtml(item.plain_text ?? "");
  const annotations = item.annotations ?? {};

  if (annotations.code) value = `<code>${value}</code>`;
  if (annotations.bold) value = `<strong>${value}</strong>`;
  if (annotations.italic) value = `<em>${value}</em>`;
  if (annotations.strikethrough) value = `<s>${value}</s>`;
  if (annotations.underline) value = `<u>${value}</u>`;

  const color = annotations.color;
  if (color && color !== "default") {
    if (color.endsWith("_background")) {
      const cls = `txt-bg--${color.replace("_background", "")}`;
      value = `<span class="${cls}">${value}</span>`;
    } else {
      const cls = `txt--${color}`;
      value = `<span class="${cls}">${value}</span>`;
    }
  }

  if (item.href) {
    const href = safeUrl(item.href);
    value = `<a href="${escapeAttribute(href)}" rel="noopener">${value}</a>`;
  }

  return value;
}

function renderMention(item: any): string {
  const m = item.mention;
  if (!m) return escapeHtml(item.plain_text ?? "");

  if (m.type === "date") {
    const start = m.date?.start;
    if (start) {
      const dateOnly = start.slice(0, 10);
      const parsed = new Date(`${dateOnly}T12:00:00`);
      const formatted = !Number.isNaN(parsed.getTime())
        ? new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }).format(parsed)
        : (item.plain_text ?? "");
      return `<time class="mention mention--date" datetime="${escapeAttribute(start)}">${escapeHtml(formatted)}</time>`;
    }
  }

  if (m.type === "page" || m.type === "link_mention" || m.type === "database") {
    const text = escapeHtml(item.plain_text ?? "");
    const href = item.href ? escapeAttribute(safeUrl(item.href)) : "#";
    return `<a class="mention mention--page" href="${href}">${text}</a>`;
  }

  if (m.type === "user") {
    return `<span class="mention mention--user">@${escapeHtml(item.plain_text ?? "")}</span>`;
  }

  return escapeHtml(item.plain_text ?? "");
}
