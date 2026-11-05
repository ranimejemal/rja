import { Fragment, type ReactNode } from "react";

// Minimal, safe Markdown renderer for agreement texts and setup guides: headings, lists, paragraphs, **bold**
// and `code`.
// Text is rendered as React nodes, never as raw HTML.

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part.startsWith("`") && part.endsWith("`") && part.length > 2 ? <code key={i}>{part.slice(1, -1)}</code>
        : <Fragment key={i}>{part}</Fragment>);
}

type Item = { text: string; children: string[] };

export function Markdown({ source }: { source: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: Item[] } | null = null;
  const flush = () => {
    if (!list) return;
    const items = list.items.map((it, i) => (
      <li key={i}>{inline(it.text)}{it.children.length > 0 && <ul>{it.children.map((c, j) => <li key={j}>{inline(c)}</li>)}</ul>}</li>
    ));
    blocks.push(list.ordered ? <ol key={blocks.length}>{items}</ol> : <ul key={blocks.length}>{items}</ul>);
    list = null;
  };
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    const indented = /^\s{2,}\S/.test(raw);
    const ol = line.match(/^\d+\.\s+(.*)$/);
    const ul = line.match(/^[-*]\s+(.*)$/);
    const last = list?.items[list.items.length - 1];
    // Indented lines belong to the list item above: sub-points, or the rest of its text.
    if (indented && last) {
      if (ol || ul) last.children.push((ol ?? ul)![1]);
      else if (last.children.length) last.children[last.children.length - 1] += ` ${line}`;
      else last.text += ` ${line}`;
      continue;
    }
    if (ol || ul) {
      const ordered = Boolean(ol);
      if (!list || list.ordered !== ordered) { flush(); list = { ordered, items: [] }; }
      list.items.push({ text: (ol ?? ul)![1], children: [] });
      continue;
    }
    flush();
    if (!line) continue;
    const h = line.match(/^(#{2,3})\s+(.*)$/);
    if (h) blocks.push(h[1] === "##" ? <h2 key={blocks.length}>{inline(h[2])}</h2> : <h3 key={blocks.length}>{inline(h[2])}</h3>);
    else blocks.push(<p key={blocks.length}>{inline(line)}</p>);
  }
  flush();
  return <div className="prose">{blocks}</div>;
}
