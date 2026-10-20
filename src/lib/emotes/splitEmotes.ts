import { MessagePartType, type MessagePart } from "#lib/chat/ChatMessage.ts";
import type { Emote, EmoteMap } from "./Emote";

/**
 * Turn words in text parts that are emote codes into emote parts. Words are
 * separated by whitespace, like the browser extensions do it. Other parts,
 * such as Twitch's own emotes, pass through.
 *
 * A zero-width emote right after another emote (only whitespace between)
 * becomes an overlay of that emote instead of a part of its own.
 */
export function splitEmotes(
  parts: MessagePart[],
  emotes: EmoteMap,
): MessagePart[] {
  if (emotes.size === 0) return parts;

  const result: MessagePart[] = [];
  for (const part of parts) {
    if (part.type !== MessagePartType.Text) {
      result.push(part);
      continue;
    }
    for (const word of part.content.split(/(\s+)/)) {
      const emote = emotes.get(word);
      if (!emote) {
        appendText(result, word);
      } else if (!(emote.zeroWidth && stackOnPrevious(result, emote))) {
        result.push(emotePart(emote));
      }
    }
  }
  return result;
}

function emotePart(emote: Emote): MessagePart {
  const part: MessagePart = {
    type: MessagePartType.Emote,
    content: emote.id,
    emoteName: emote.code,
    emoteImages: emote.images,
    emoteProvider: emote.provider,
  };
  if (emote.heightScale !== undefined) {
    part.emoteHeightScale = emote.heightScale;
  }
  return part;
}

function appendText(parts: MessagePart[], text: string): void {
  if (!text) return;
  const last = parts.at(-1);
  if (last?.type === MessagePartType.Text) {
    parts[parts.length - 1] = { ...last, content: last.content + text };
  } else {
    parts.push({ type: MessagePartType.Text, content: text });
  }
}

/** Adds the overlay to the preceding emote, false if there is none */
function stackOnPrevious(parts: MessagePart[], overlay: Emote): boolean {
  let index = parts.length - 1;
  if (parts[index]?.type === MessagePartType.Text) {
    // only whitespace may separate them
    if (parts[index].content.trim() !== "") return false;
    index--;
  }
  const base = parts[index];
  if (base?.type !== MessagePartType.Emote) return false;

  // copies: parts that came in (Twitch emotes) are not ours to change
  parts[index] = {
    ...base,
    emoteOverlays: [...(base.emoteOverlays ?? []), emotePart(overlay)],
  };
  parts.length = index + 1;
  return true;
}
