import * as React from "react";

// Renders the small markdown subset chat replies use (bold, inline code,
// bullet lists, headings) without showing raw asterisks.
function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={i} className="rounded bg-black/5 px-1 py-0.5 font-mono text-[11px]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

const BULLET = /^\s*(?:[•\-*]\s+)(.*)$/;
const HEADING = /^#{1,6}\s+(.*)$/;

export function ChatText({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let items: string[] = [];

  const flushList = (key: number) => {
    if (!items.length) return;
    blocks.push(
      <ul key={`ul-${key}`} className="space-y-1 pl-4 list-disc marker:text-current/50">
        {items.map((it, i) => (
          <li key={i}>{renderInline(it)}</li>
        ))}
      </ul>,
    );
    items = [];
  };

  text.split("\n").forEach((line, idx) => {
    const bullet = line.match(BULLET);
    if (bullet) {
      items.push(bullet[1]);
      return;
    }
    flushList(idx);
    if (!line.trim()) return;
    const heading = line.match(HEADING);
    blocks.push(
      <p key={idx} className={heading ? "font-bold" : undefined}>
        {renderInline(heading ? heading[1] : line)}
      </p>,
    );
  });
  flushList(blocks.length);

  return <div className="space-y-2">{blocks}</div>;
}
