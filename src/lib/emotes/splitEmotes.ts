import { MessagePartType, type MessagePart } from "#lib/chat/ChatMessage.ts";
import type { EmoteMap } from "./Emote";

/**
 * Turn words in text parts that are emote codes into emote parts. Words are
 * separated by whitespace, like the browser extensions do it. Other parts,
 * such as Twitch's own emotes, pass through.
 */
export function splitEmotes(
  parts: MessagePart[],
  emotes: EmoteMap,
): MessagePart[] {
  if (emotes.size === 0) return parts;
  return parts.flatMap((part) =>
    part.type === MessagePartType.Text
      ? splitText(part.content, emotes)
      : [part],
  );
}

function splitText(text: string, emotes: EmoteMap): MessagePart[] {
  const parts: MessagePart[] = [];
  let pending = "";

  for (const word of text.split(/(\s+)/)) {
    const emote = emotes.get(word);
    if (!emote) {
      pending += word;
      continue;
    }
    if (pending) parts.push({ type: MessagePartType.Text, content: pending });
    pending = "";
    parts.push({
      type: MessagePartType.Emote,
      content: emote.id,
      emoteName: emote.code,
      emoteUrl: emote.url,
      emoteProvider: emote.provider,
    });
  }

  if (pending || parts.length === 0) {
    parts.push({ type: MessagePartType.Text, content: pending });
  }
  return parts;
}
