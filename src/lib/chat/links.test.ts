import { describe, expect, it } from "bun:test";
import { MessagePartType, type MessagePart } from "./ChatMessage";
import { splitLinks } from "./links";

const text = (content: string): MessagePart => ({
  type: MessagePartType.Text,
  content,
});
const link = (content: string, href: string): MessagePart => ({
  type: MessagePartType.Link,
  content,
  href,
});

describe("splitLinks", () => {
  it("leaves text without links alone", () => {
    expect(splitLinks([text("just chatting")])).toEqual([
      text("just chatting"),
    ]);
  });

  it("splits explicit URLs out of the text", () => {
    expect(
      splitLinks([text("look at https://example.com/a?b=c#d now")]),
    ).toEqual([
      text("look at "),
      link("https://example.com/a?b=c#d", "https://example.com/a?b=c#d"),
      text(" now"),
    ]);
  });

  it("links bare domains over http", () => {
    expect(splitLinks([text("twitch.tv/foo")])).toEqual([
      link("twitch.tv/foo", "http://twitch.tv/foo"),
    ]);
  });

  it("finds several links in one part", () => {
    expect(splitLinks([text("a.com and b.org")])).toEqual([
      link("a.com", "http://a.com"),
      text(" and "),
      link("b.org", "http://b.org"),
    ]);
  });

  it("does not link words that only look like domains", () => {
    expect(splitLinks([text("file.txt is 3.5 MB lol...ok")])).toEqual([
      text("file.txt is 3.5 MB lol...ok"),
    ]);
  });

  it("ignores emails and non-web schemes", () => {
    expect(
      splitLinks([text("mail me@example.com or ftp://example.com")]),
    ).toEqual([text("mail me@example.com or ftp://example.com")]);
  });

  it("keeps emotes between text parts", () => {
    const emote: MessagePart = {
      type: MessagePartType.Emote,
      content: "25",
      emoteName: "Kappa",
    };
    expect(splitLinks([text("x.com "), emote, text(" hi")])).toEqual([
      link("x.com", "http://x.com"),
      text(" "),
      emote,
      text(" hi"),
    ]);
  });
});
