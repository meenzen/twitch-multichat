import { ImageResponse } from "@ethercorps/sveltekit-og";
import inter600 from "@fontsource/inter/files/inter-latin-600-normal.woff?inline";
import inter700 from "@fontsource/inter/files/inter-latin-700-normal.woff?inline";
import PreviewImage from "#lib/components/PreviewImage.svelte";
import type { RequestHandler } from "@sveltejs/kit";

// Bundled into the server code: no fetch, the same on workerd and Node.
// satori reads woff but not woff2. The latin subset covers everything the
// image shows (Twitch names are ASCII).
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
    channels: url.searchParams.getAll("channel"),
    logoUrl: url.origin + "/logo-512x512.png",
    host: url.host,
  });
};
