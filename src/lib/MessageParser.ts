import type { ChatMessage } from "@twurple/chat";
import { parseChatMessage, type ParsedMessagePart } from "@twurple/chat";

export enum MessageType {
  Normal,
  Action,
}

export type RawMessage = {
  message: ChatMessage;
  type: MessageType;
};

export type ParsedMessage = {
  type: MessageType;
  parts: Array<MessagePart>;
  id: string;
  target: string;
  userName: string;
  displayName: string;
  userColor: string | undefined;
};

export enum MessagePartType {
  Text,
  Emote,
}

export type MessagePart = {
  type: MessagePartType;
  content: string;
  emoteName?: string;
};

export function parseMessage(raw: RawMessage): ParsedMessage {
  const parts: Array<MessagePart> = [];

  const messageContent = raw.message.text;

  // Use twurple's parseChatMessage utility to parse emotes
  const parsedParts: ParsedMessagePart[] = parseChatMessage(
    messageContent,
    raw.message.emoteOffsets,
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

  if (raw.type === MessageType.Action && parts.length > 0) {
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

  return {
    type: raw.type,
    parts: parts,
    id: raw.message.id,
    target: raw.message.target,
    userName: raw.message.userInfo.userName,
    displayName: raw.message.userInfo.displayName,
    userColor: raw.message.userInfo.color,
  };
}
