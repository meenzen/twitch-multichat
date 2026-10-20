// Display model for chat messages. Deliberately free of any @twurple imports so
// that the UI can be rendered and tested without a Twitch connection.

import type { EmoteImage } from "#lib/emotes/Emote.ts";

export enum MessageType {
  Normal,
  Action,
}

export enum MessagePartType {
  Text,
  Emote,
  Link,
}

export type MessagePart = {
  type: MessagePartType;
  content: string;
  emoteName?: string;
  /** Images of a third-party emote; Twitch emotes are looked up by id */
  emoteImages?: EmoteImage[];
  /** Height of a third-party emote relative to a normal one (default 1) */
  emoteHeightScale?: number;
  /** The service a third-party emote comes from, e.g. "bttv" */
  emoteProvider?: string;
  /** Zero-width emotes drawn on top of this emote, in order */
  emoteOverlays?: MessagePart[];
  /** Target of a link part, `content` holds the text as written */
  href?: string;
};

export type ParsedMessage = {
  type: MessageType;
  parts: Array<MessagePart>;
  id: string;
  /** Channel name without the leading "#", lowercase */
  channel: string;
  userId: string;
  userName: string;
  displayName: string;
  userColor: string | undefined;
  /** When the message was sent (ms since epoch) */
  timestamp: number;
};

/** Marks a gap in the timeline in which the chat was not connected */
export type DisconnectEntry = {
  kind: "disconnect";
  id: string;
  /** Last time the connection was known to work (ms since epoch) */
  since: number;
  /** When the connection was back (ms since epoch) */
  until: number;
};

/** Anything shown in the chat timeline */
export type ChatEntry = ParsedMessage | DisconnectEntry;

export function isMessage(entry: ChatEntry): entry is ParsedMessage {
  return !("kind" in entry);
}
