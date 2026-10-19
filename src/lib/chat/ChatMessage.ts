// Display model for chat messages. Deliberately free of any @twurple imports so
// that the UI can be rendered and tested without a Twitch connection.

export enum MessageType {
  Normal,
  Action,
}

export enum MessagePartType {
  Text,
  Emote,
}

export type MessagePart = {
  type: MessagePartType;
  content: string;
  emoteName?: string;
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
};
