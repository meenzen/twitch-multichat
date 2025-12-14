import type { ChatMessage } from "@twurple/chat";
import { parseChatMessage, type ParsedMessagePart } from "@twurple/chat";

export enum MessagePartType {
  Text,
  Emote,
}

export type MessagePart = {
  type: MessagePartType;
  content: string;
  emoteName?: string;
};

/** Returns true if the message is an action (italicized text) */
export function isAction(message: ChatMessage): boolean {
  const text = message.text;
  // italicized text is surrounded by \u0001
  return text.startsWith("\u0001") && text.endsWith("\u0001");
}

export function parseMessage(message: ChatMessage): Array<MessagePart> {
  const parts: Array<MessagePart> = [];

  const messageContent = message.text;
  const action = isAction(message);

  // Use twurple's parseChatMessage utility to parse emotes
  const parsedParts: ParsedMessagePart[] = parseChatMessage(
    messageContent,
    message.emoteOffsets,
  );

  // Convert twurple's ParsedMessagePart to our MessagePart format
  for (const parsedPart of parsedParts) {
    if (parsedPart.type === "emote") {
      parts.push({
        type: MessagePartType.Emote,
        content: parsedPart.id,
        emoteName: parsedPart.name,
      });
    } else if (parsedPart.type === "text") {
      parts.push({
        type: MessagePartType.Text,
        content: parsedPart.text,
      });
    }
  }

  if (action && parts.length > 0) {
    const firstPart = parts[0];
    const lastPart = parts[parts.length - 1];

    // strip the \u0001 characters
    if (firstPart.type === MessagePartType.Text) {
      firstPart.content = firstPart.content.replace("\u0001", "");
    }

    if (lastPart.type === MessagePartType.Text) {
      lastPart.content = lastPart.content.replace("\u0001", "");
    }

    // remove the "ACTION" text from the first part
    if (firstPart.type === MessagePartType.Text) {
      firstPart.content = firstPart.content.replace("ACTION ", "");
    }
  }

  return parts;
}
