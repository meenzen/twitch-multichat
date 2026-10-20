import { ImageResponse } from "@ethercorps/sveltekit-og";
import { GoogleFont, resolveFonts } from "@ethercorps/sveltekit-og/fonts";
import PreviewImage from "#lib/components/PreviewImage.svelte";
import type { RequestHandler } from "@sveltejs/kit";

const fonts = [
  new GoogleFont("Inter", { weight: 600, name: "Inter" }),
  new GoogleFont("Inter", { weight: 700, name: "Inter" }),
];

// without channels: the landing page
export const GET: RequestHandler = async ({ url }) => {
  const options = {
    width: 1200,
    height: 630,
    fonts: await resolveFonts(fonts),
  };
  return new ImageResponse(PreviewImage, options, {
    channels: url.searchParams.getAll("channel"),
    logoUrl: url.origin + "/logo-512x512.png",
    host: url.host,
  });
};
