import type { EmoteTag, PrivateMessages } from "twitch-js";

export enum MessagePartType {
  Text,
  Emote,
}

export type MessagePart = {
  type: MessagePartType;
  content: string;
  emoteName?: string;
};

function getEmoteName(message: string, emote: EmoteTag): string {
  return message.substring(emote.start, emote.end + 1);
}

/** Returns true if the message is an action (italicized text) */
export function isAction(message: PrivateMessages): boolean {
  const text = message.message;
  // italicized text is surrounded by \u0001
  return text.startsWith("\u0001") && text.endsWith("\u0001");
}

export function parseMessage(message: PrivateMessages): Array<MessagePart> {
  const parts: Array<MessagePart> = [];

  const messageContent = message.message;
  const tags = message.tags;
  const action = isAction(message);

  if ("emotes" in tags && tags.emotes && tags.emotes.length > 0) {
    const emotes: EmoteTag[] = tags.emotes;

    // sort emotes by position
    emotes.sort((a, b) => {
      return a.start - b.start;
    });

    // add the first part of the message
    const first = emotes[0];
    parts.push({
      type: MessagePartType.Text,
      content: messageContent.substring(0, first.start),
    });

    // add the emotes
    emotes.forEach((emote, index) => {
      parts.push({
        type: MessagePartType.Emote,
        content: emote.id,
        emoteName: getEmoteName(messageContent, emote),
      });

      // if this is the last emote, add the last part of the message
      if (index === emotes.length - 1) {
        parts.push({
          type: MessagePartType.Text,
          content: messageContent.substring(emote.end + 1),
        });
      } else {
        // add the text between this emote and the next one
        parts.push({
          type: MessagePartType.Text,
          content: messageContent.substring(
            emote.end + 1,
            emotes[index + 1].start,
          ),
        });
      }
    });
  } else {
    parts.push({ type: MessagePartType.Text, content: messageContent });
  }

  if (action) {
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
