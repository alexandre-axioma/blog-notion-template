import { richText } from "./inline";
import { proxyAsset } from "./images";
import { highlightCode } from "./highlight";
import { renderEquation } from "./math";
import { renderEmbedUrl } from "./embeds";
import { escapeAttribute, escapeHtml, plainText, safeUrl, slugify } from "./helpers";

export type ChildrenFetcher = (blockId: string) => Promise<any[]>;

/**
 * Renders an array of Notion blocks to HTML. Async + recursive: for any
 * block with `has_children: true`, we fetch and render children inline.
 */
export async function renderBlocks(
  blocks: any[],
  fetchChildren: ChildrenFetcher,
): Promise<string> {
  const out: string[] = [];

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];

    // Group consecutive bullets
    if (block.type === "bulleted_list_item") {
      const items: string[] = [];
      while (blocks[i]?.type === "bulleted_list_item") {
        items.push(await renderListItem(blocks[i], "bulleted_list_item", fetchChildren));
        i += 1;
      }
      i -= 1;
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    // Group consecutive numbered items
    if (block.type === "numbered_list_item") {
      const items: string[] = [];
      while (blocks[i]?.type === "numbered_list_item") {
        items.push(await renderListItem(blocks[i], "numbered_list_item", fetchChildren));
        i += 1;
      }
      i -= 1;
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    // Group consecutive to-dos
    if (block.type === "to_do") {
      const items: string[] = [];
      while (blocks[i]?.type === "to_do") {
        items.push(await renderTodoItem(blocks[i], fetchChildren));
        i += 1;
      }
      i -= 1;
      out.push(`<div class="todo-list">${items.join("")}</div>`);
      continue;
    }

    out.push(await renderBlock(block, fetchChildren));
  }

  return out.filter(Boolean).join("\n");
}

async function renderListItem(
  block: any,
  type: "bulleted_list_item" | "numbered_list_item",
  fetchChildren: ChildrenFetcher,
): Promise<string> {
  const text = richText(block[type].rich_text);
  let childrenHtml = "";
  if (block.has_children) {
    const children = await fetchChildren(block.id);
    childrenHtml = await renderBlocks(children, fetchChildren);
  }
  return `<li>${text}${childrenHtml}</li>`;
}

async function renderTodoItem(block: any, fetchChildren: ChildrenFetcher): Promise<string> {
  const text = richText(block.to_do.rich_text);
  const checked = !!block.to_do.checked;
  let childrenHtml = "";
  if (block.has_children) {
    const children = await fetchChildren(block.id);
    childrenHtml = await renderBlocks(children, fetchChildren);
  }
  return `<div class="todo${checked ? " todo--done" : ""}">
    <span class="todo__check" aria-hidden="true">${checked ? "✓" : ""}</span>
    <div class="todo__body">
      <span class="todo__text">${text}</span>
      ${childrenHtml}
    </div>
  </div>`;
}

async function renderBlock(block: any, fetchChildren: ChildrenFetcher): Promise<string> {
  const type = block.type;

  switch (type) {
    case "paragraph": {
      const text = richText(block.paragraph.rich_text);
      let childrenHtml = "";
      if (block.has_children) {
        const children = await fetchChildren(block.id);
        childrenHtml = await renderBlocks(children, fetchChildren);
      }
      if (!text && !childrenHtml) return "";
      return `<p>${text}</p>${childrenHtml}`;
    }

    case "heading_1": {
      const text = richText(block.heading_1.rich_text);
      const id = slugify(plainText(block.heading_1.rich_text));
      // Downgrade for SEO: page already has a single h1
      return `<h2 id="${escapeAttribute(id)}">${text}</h2>`;
    }

    case "heading_2": {
      const text = richText(block.heading_2.rich_text);
      const id = slugify(plainText(block.heading_2.rich_text));
      return `<h3 id="${escapeAttribute(id)}">${text}</h3>`;
    }

    case "heading_3": {
      const text = richText(block.heading_3.rich_text);
      return `<h4>${text}</h4>`;
    }

    case "quote": {
      const text = richText(block.quote.rich_text);
      let childrenHtml = "";
      if (block.has_children) {
        const children = await fetchChildren(block.id);
        childrenHtml = await renderBlocks(children, fetchChildren);
      }
      return `<blockquote>${text}${childrenHtml}</blockquote>`;
    }

    case "code": {
      const code = (block.code.rich_text ?? []).map((t: any) => t.plain_text).join("");
      const lang = block.code.language ?? "plaintext";
      const captionHtml = richText(block.code.caption);
      const highlighted = await highlightCode(code, lang);
      const langLabel = lang && lang !== "plaintext"
        ? `<span class="code-block__lang">${escapeHtml(lang)}</span>`
        : "";
      const wrapped = `<div class="code-block">
        <div class="code-block__bar">${langLabel}<button class="code-block__copy" type="button" aria-label="Copiar código"><span class="code-block__copy-label">Copiar</span></button></div>
        ${highlighted}
      </div>`;
      return captionHtml
        ? `<figure class="code-figure">${wrapped}<figcaption>${captionHtml}</figcaption></figure>`
        : wrapped;
    }

    case "equation": {
      const expr = block.equation.expression ?? "";
      return `<div class="equation">${renderEquation(expr, true)}</div>`;
    }

    case "divider":
      return "<hr />";

    case "image": {
      const src = block.image.type === "external" ? block.image.external.url : block.image.file.url;
      const proxied = block.image.type === "file" ? await proxyAsset(src, block.id) : src;
      const captionRich = block.image.caption;
      const captionHtml = richText(captionRich);
      const altText = plainText(captionRich) || "Imagem do post";
      return `<figure>
        <img src="${escapeAttribute(safeUrl(proxied))}" alt="${escapeAttribute(altText)}" loading="lazy" decoding="async" />
        ${captionHtml ? `<figcaption>${captionHtml}</figcaption>` : ""}
      </figure>`;
    }

    case "video": {
      const isFile = block.video.type === "file";
      const url = isFile ? block.video.file.url : block.video.external.url;
      const captionHtml = richText(block.video.caption);
      if (isFile) {
        const proxied = await proxyAsset(url, block.id);
        return `<figure class="video-figure">
          <video controls preload="metadata" src="${escapeAttribute(safeUrl(proxied))}"></video>
          ${captionHtml ? `<figcaption>${captionHtml}</figcaption>` : ""}
        </figure>`;
      }
      return renderEmbedUrl(url, captionHtml);
    }

    case "audio": {
      const isFile = block.audio.type === "file";
      const url = isFile ? block.audio.file.url : block.audio.external.url;
      const proxied = isFile ? await proxyAsset(url, block.id) : url;
      const captionHtml = richText(block.audio.caption);
      return `<figure class="audio-figure">
        <audio controls preload="metadata" src="${escapeAttribute(safeUrl(proxied))}"></audio>
        ${captionHtml ? `<figcaption>${captionHtml}</figcaption>` : ""}
      </figure>`;
    }

    case "file": {
      const isFile = block.file.type === "file";
      const url = isFile ? block.file.file.url : block.file.external.url;
      const proxied = isFile ? await proxyAsset(url, block.id) : url;
      const name = block.file.name || (() => {
        try { return new URL(url).pathname.split("/").pop() || url; } catch { return url; }
      })();
      const captionHtml = richText(block.file.caption);
      return `<figure class="file-figure">
        <a class="file-card" href="${escapeAttribute(safeUrl(proxied))}" target="_blank" rel="noopener">
          <span class="file-card__icon" aria-hidden="true">📄</span>
          <span class="file-card__name">${escapeHtml(name)}</span>
        </a>
        ${captionHtml ? `<figcaption>${captionHtml}</figcaption>` : ""}
      </figure>`;
    }

    case "pdf": {
      const isFile = block.pdf.type === "file";
      const url = isFile ? block.pdf.file.url : block.pdf.external.url;
      const proxied = isFile ? await proxyAsset(url, block.id) : url;
      const captionHtml = richText(block.pdf.caption);
      return `<figure class="pdf-figure">
        <div class="embed__frame embed__frame--4-3">
          <iframe src="${escapeAttribute(safeUrl(proxied))}" title="PDF" loading="lazy"></iframe>
        </div>
        ${captionHtml ? `<figcaption>${captionHtml}</figcaption>` : ""}
      </figure>`;
    }

    case "bookmark":
    case "link_preview":
    case "embed": {
      const url = block[type]?.url ?? "";
      const captionHtml = richText(block[type]?.caption);
      return renderEmbedUrl(url, captionHtml);
    }

    case "callout": {
      const text = richText(block.callout.rich_text);
      const icon = block.callout.icon;
      const colorRaw = block.callout.color || "default";

      let iconHtml = "";
      if (icon?.type === "emoji") {
        iconHtml = `<span class="callout__icon" aria-hidden="true">${escapeHtml(icon.emoji)}</span>`;
      } else if (icon?.type === "external") {
        iconHtml = `<img class="callout__icon" src="${escapeAttribute(icon.external.url)}" alt="" />`;
      }

      let childrenHtml = "";
      if (block.has_children) {
        const children = await fetchChildren(block.id);
        childrenHtml = await renderBlocks(children, fetchChildren);
      }

      const colorClass = colorRaw !== "default"
        ? ` callout--${colorRaw.replace("_background", "")}`
        : "";

      return `<aside class="callout${colorClass}">
        ${iconHtml}
        <div class="callout__body">
          ${text ? `<p>${text}</p>` : ""}
          ${childrenHtml}
        </div>
      </aside>`;
    }

    case "toggle": {
      const text = richText(block.toggle.rich_text);
      let childrenHtml = "";
      if (block.has_children) {
        const children = await fetchChildren(block.id);
        childrenHtml = await renderBlocks(children, fetchChildren);
      }
      return `<details class="toggle">
        <summary><span class="toggle__label">${text}</span></summary>
        <div class="toggle__body">${childrenHtml}</div>
      </details>`;
    }

    case "table": {
      const rows = block.has_children ? await fetchChildren(block.id) : [];
      const hasColumnHeader = !!block.table?.has_column_header;
      const renderedRows = rows.map((row: any, idx: number) => {
        if (row.type !== "table_row") return "";
        const cells = (row.table_row.cells ?? []).map((cellRich: any[]) => richText(cellRich));
        if (idx === 0 && hasColumnHeader) {
          return `<tr>${cells.map((c: string) => `<th>${c}</th>`).join("")}</tr>`;
        }
        return `<tr>${cells.map((c: string) => `<td>${c}</td>`).join("")}</tr>`;
      });
      const head = hasColumnHeader && renderedRows[0]
        ? `<thead>${renderedRows[0]}</thead><tbody>${renderedRows.slice(1).join("")}</tbody>`
        : `<tbody>${renderedRows.join("")}</tbody>`;
      return `<div class="table-wrap"><table class="prose-table">${head}</table></div>`;
    }

    case "column_list": {
      const cols = await fetchChildren(block.id);
      const colsHtml = await Promise.all(
        cols.map(async (col: any) => {
          if (col.type !== "column") return "";
          const colChildren = await fetchChildren(col.id);
          const inner = await renderBlocks(colChildren, fetchChildren);
          return `<div class="column">${inner}</div>`;
        })
      );
      return `<div class="column-list" data-cols="${cols.length}">${colsHtml.join("")}</div>`;
    }

    case "child_page":
    case "child_database":
    case "synced_block":
    case "table_of_contents":
    case "breadcrumb":
    case "template":
      // Out of scope for static blog rendering
      return "";

    default:
      return "";
  }
}
