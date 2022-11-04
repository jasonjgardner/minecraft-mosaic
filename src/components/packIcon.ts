import type { PaletteInput } from "../types.d.ts";
import {
  COMPRESSION_LEVEL,
  DEFAULT_PACK_ICON_URL,
  FONT_FILE,
  FONT_URL,
  PACK_ICON_FONT_SIZE,
  PACK_ICON_SIZE,
} from "../constants.ts";
import { join } from "path/mod.ts";
import { Frame, GIF, Image, TextLayout } from "imagescript/mod.ts";
import { handlePaletteInput } from "../_utils.ts";

function loadFont() {
  try {
    return Deno.readFile(
      join(Deno.cwd(), "src", "assets", "fonts", FONT_FILE),
    );
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return fetch(FONT_URL).then((res) => res.arrayBuffer()).then((buf) =>
        new Uint8Array(buf)
      );
    }
    console.log("Failed reading local font: %s", err);
  }
}

export async function getDefaultIcon() {
  try {
    return Deno.readFile(
      join(Deno.cwd(), "src", "assets", "img", "pack_icon.png"),
    );
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      console.log("Default pack icon not found");
    }
  }

  return new Uint8Array(
    await (await fetch(DEFAULT_PACK_ICON_URL)).arrayBuffer(),
  );
}

async function createHeadline(namespace: string, icon: Image | Frame) {
  try {
    const fontData = await loadFont();

    if (!fontData) {
      console.warn("Failed loading font data");
      return icon;
    }

    const dominantRgba = Image.colorToRGBA(icon.dominantColor());
    const dominantHsla = Image.rgbaToHSLA(
      dominantRgba[0],
      dominantRgba[1],
      dominantRgba[2],
      1,
    );
    // Desaturate and lighten text
    const textColor = Image.hslToColor(
      dominantHsla[0],
      Math.max(0, Math.min(0.66, dominantHsla[1])),
      Math.max(0.75, Math.min(0.99, dominantHsla[2])),
    );

    const iconHeadlineImg = Image.renderText(
      fontData,
      PACK_ICON_FONT_SIZE,
      namespace.toUpperCase(),
      textColor,
      new TextLayout({
        horizontalAlign: "middle",
        verticalAlign: "center",
        wrapHardBreaks: false,
      }),
    );
    icon.lightness(0.66); // Dim background for text legibility
    icon.saturation(0.75);
    icon.composite(iconHeadlineImg);
  } catch (err) {
    console.warn("Failed adding pack title to icon: %s", err);
  }

  return icon;
}

export async function generatePackIcon(
  namespace: string,
  artSrc: PaletteInput,
) {
  const iconSrc = await (artSrc !== null
    ? handlePaletteInput(
      artSrc,
    )
    : Image.decode(await getDefaultIcon()));

  const icon = iconSrc instanceof GIF ? iconSrc[0] : iconSrc;

  // Resize to ideal pack_icon.png dimensions
  icon.contain(PACK_ICON_SIZE, PACK_ICON_SIZE);

  // Attempt to overlay the pack title on the icon
  try {
    createHeadline(namespace, icon);
  } catch (err) {
    console.log("Can not render text: %s", err);
  }

  return icon.encode(COMPRESSION_LEVEL);
}
