import { find } from "linkifyjs";
import { MessagePartType, type MessagePart } from "./ChatMessage";

/**
 * Split URLs out of text parts, like Twitch does: explicit http(s) URLs and
 * bare domains such as "twitch.tv/foo". Other parts pass through unchanged.
 */
export function splitLinks(parts: MessagePart[]): MessagePart[] {
  return parts.flatMap((part) =>
    part.type === MessagePartType.Text ? splitText(part.content) : [part],
  );
}

function splitText(text: string): MessagePart[] {
  const parts: MessagePart[] = [];
  let position = 0;

  for (const link of find(text, "url")) {
    // only ever link web pages (no javascript:, ftp:, ...)
    if (!/^https?:\/\//i.test(link.href)) continue;

    if (link.start > position) {
      parts.push(textPart(text.slice(position, link.start)));
    }
    parts.push({
      type: MessagePartType.Link,
      content: link.value,
      href: link.href,
    });
    position = link.end;
  }

  if (position < text.length || parts.length === 0) {
    parts.push(textPart(text.slice(position)));
  }
  return parts;
}

function textPart(content: string): MessagePart {
  return { type: MessagePartType.Text, content };
}
