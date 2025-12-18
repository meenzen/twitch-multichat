import { ImageResponse } from "@ethercorps/sveltekit-og";
import { GoogleFont, resolveFonts } from "@ethercorps/sveltekit-og/fonts";
import PreviewImage from "$lib/components/PreviewImage.svelte";
import type { RequestHandler } from "@sveltejs/kit";

const interRegular = new GoogleFont("Inter", {
  weight: 600,
  name: "Inter",
});

export const GET: RequestHandler = async ({ url }) => {
  const props = {
    channels: url.searchParams.getAll("channel"),
    logoUrl: url.origin + "/logo-512x512.png",
  };
  const resolvedFontOptions = await resolveFonts([interRegular]);
  return new ImageResponse(
    PreviewImage,
    {
      width: 1200,
      height: 630,
      fonts: resolvedFontOptions,
    },
    props,
  );
};
