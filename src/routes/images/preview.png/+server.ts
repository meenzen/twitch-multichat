import { ImageResponse } from "@ethercorps/sveltekit-og";
import inter600 from "@fontsource/inter/files/inter-latin-600-normal.woff?inline";
import inter700 from "@fontsource/inter/files/inter-latin-700-normal.woff?inline";
import logo from "#lib/assets/logo.png?inline";
import PreviewImage from "#lib/components/PreviewImage.svelte";
import TwitchChannel from "#lib/TwitchChannel.ts";
import type { RequestHandler } from "@sveltejs/kit";

// Renders without any request: fonts and logo are bundled into the server
// code, the same on workerd and Node. satori reads woff but not woff2. The
// latin subset covers everything the image shows: invalid channel names
// are dropped, which also keeps emoji out (sveltekit-og fetches those).
const fonts = [
  { name: "Inter", data: dataUrlBytes(inter600), weight: 600 as const },
  { name: "Inter", data: dataUrlBytes(inter700), weight: 700 as const },
];

function dataUrlBytes(url: string): ArrayBuffer {
  const binary = atob(url.slice(url.indexOf(",") + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// without channels: the landing page
export const GET: RequestHandler = async ({ url }) => {
  const options = { width: 1200, height: 630, fonts };
  return new ImageResponse(PreviewImage, options, {
    channels: url.searchParams
      .getAll("channel")
      .filter((channel) => TwitchChannel.isValid(channel)),
    logoUrl: logo,
    host: url.host,
  });
};
