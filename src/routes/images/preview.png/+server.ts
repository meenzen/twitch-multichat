import { ImageResponse } from "@ethercorps/sveltekit-og";
import { GoogleFont, resolveFonts } from "@ethercorps/sveltekit-og/fonts";
import LandingPreviewImage from "#lib/components/LandingPreviewImage.svelte";
import PreviewImage from "#lib/components/PreviewImage.svelte";
import type { RequestHandler } from "@sveltejs/kit";

const fonts = [
  new GoogleFont("Inter", { weight: 600, name: "Inter" }),
  new GoogleFont("Inter", { weight: 700, name: "Inter" }),
];

export const GET: RequestHandler = async ({ url }) => {
  const channels = url.searchParams.getAll("channel");
  const logoUrl = url.origin + "/logo-512x512.png";
  const options = {
    width: 1200,
    height: 630,
    fonts: await resolveFonts(fonts),
  };

  // without channels: the landing page
  return channels.length > 0
    ? new ImageResponse(PreviewImage, options, { channels, logoUrl })
    : new ImageResponse(LandingPreviewImage, options, {
        logoUrl,
        host: url.host,
      });
};
