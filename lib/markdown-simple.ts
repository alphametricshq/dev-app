// Renderer de markdown bem simples — sem deps externas.
// Suporta: # ## ### headings, **bold**, *italic*, `code`, [link](url),
//   - listas, > blockquote, parágrafos, \n\n separa blocos.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(text: string): string {
  let s = escapeHtml(text);
  // code `...`
  s = s.replace(/`([^`]+)`/g, '<code class="rounded bg-bg-hover px-1 py-0.5 font-mono text-[11px]">$1</code>');
  // bold **...**
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // italic *...*  (depois do bold)
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  // link [text](url) — só esquemas seguros viram href; javascript:/data:
  // etc. renderizam como texto (o preview roda em dangerouslySetInnerHTML)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, url: string) => {
    const trimmed = url.trim();
    if (/^(https?:\/\/|mailto:)/i.test(trimmed)) {
      return `<a href="${trimmed}" class="text-accent underline" target="_blank" rel="noopener noreferrer">${label}</a>`;
    }
    return `${label} (${trimmed})`;
  });
  return s;
}

export function renderMarkdown(text: string): string {
  if (!text.trim()) return '<p class="text-fg-subtle italic">Nada pra mostrar ainda...</p>';

  const lines = text.split("\n");
  const blocks: string[] = [];
  let para: string[] = [];
  let list: string[] = [];

  function flushPara() {
    if (para.length > 0) {
      blocks.push(`<p>${inline(para.join(" "))}</p>`);
      para = [];
    }
  }
  function flushList() {
    if (list.length > 0) {
      blocks.push(`<ul class="ml-4 list-disc space-y-0.5">${list.map((i) => `<li>${inline(i)}</li>`).join("")}</ul>`);
      list = [];
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      flushPara();
      flushList();
      continue;
    }
    // Heading
    const h = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      flushPara();
      flushList();
      const level = h[1].length;
      const cls =
        level === 1
          ? "text-base font-bold mt-2"
          : level === 2
            ? "text-sm font-bold mt-1.5"
            : "text-[13px] font-semibold mt-1";
      blocks.push(`<h${level} class="${cls}">${inline(h[2])}</h${level}>`);
      continue;
    }
    // Blockquote
    if (trimmed.startsWith("> ")) {
      flushPara();
      flushList();
      blocks.push(`<blockquote class="border-l-2 border-accent/40 pl-2 italic text-fg-muted">${inline(trimmed.slice(2))}</blockquote>`);
      continue;
    }
    // List
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      flushPara();
      list.push(trimmed.slice(2));
      continue;
    }
    // Paragraph
    flushList();
    para.push(trimmed);
  }
  flushPara();
  flushList();
  return blocks.join("\n");
}
