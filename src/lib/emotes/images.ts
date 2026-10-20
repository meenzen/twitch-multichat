import type { EmoteImage } from "./Emote";

/** Text size the emote height (28px) is designed for */
export const baseFontSize = 13;

/** Twitch's own emotes: 1.0 is 28px high, 2.0 56px and 3.0 112px */
export function twitchEmoteImages(id: string): EmoteImage[] {
  const base = `https://static-cdn.jtvnw.net/emoticons/v2/${encodeURIComponent(id)}/default/dark`;
  return [
    { url: `${base}/1.0`, density: 1 },
    { url: `${base}/2.0`, density: 2 },
    { url: `${base}/3.0`, density: 4 },
  ];
}

/**
 * srcset for an emote drawn `textScale` times its 1x size. Pixel density
 * descriptors only account for the screen, so they are divided by the
 * text scale: at twice the text size, the 2x image is the "1x" one.
 */
export function emoteSrcset(images: EmoteImage[], textScale: number): string {
  const scale = textScale > 0 ? textScale : 1;
  return images
    .map(({ url, density }) => `${url} ${round(density / scale)}x`)
    .join(", ");
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
