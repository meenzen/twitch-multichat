import type {EmoteTag, PrivateMessages, UserStateTags} from "twitch-js";

export enum MessagePartType {
    Text,
    Emote
}

export type MessagePart = {
    type: MessagePartType,
    content: string,
    emoteName?: string
}

function getEmoteName(message: string, emote: EmoteTag): string {
    return message.substring(emote.start, emote.end + 1);
}

export function parseMessage(message: PrivateMessages): Array<MessagePart> {
    const parts: Array<MessagePart> = [];

    const messageContent = message.message;
    const tags = message.tags;

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
            content: messageContent.substring(0, first.start)
        });

        // add the emotes
        emotes.forEach((emote, index) => {
            parts.push({
                type: MessagePartType.Emote,
                content: emote.id,
                emoteName: getEmoteName(messageContent, emote)
            });

            // if this is the last emote, add the last part of the message
            if (index === emotes.length - 1) {
                parts.push({type: MessagePartType.Text, content: messageContent.substring(emote.end + 1),});
            } else {
                // add the text between this emote and the next one
                parts.push({
                    type: MessagePartType.Text,
                    content: messageContent.substring(emote.end + 1, emotes[index + 1].start)
                });
            }
        });
    } else {
        parts.push({type: MessagePartType.Text, content: messageContent});
    }

    return parts;
}