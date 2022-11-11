import "dotenv/load.ts";
import type { Alignment, PaletteInput } from "../types.d.ts";
import { basename, dirname, extname, join, toFileUrl } from "path/mod.ts";
import { walk } from "fs/walk.ts";
import {
  ART_SOURCE_ID,
  CHUNK_SIZE,
  DEFAULT_PRINT_CHUNKS,
  MAX_PRINT_CHUNKS,
  MIN_PALETTE_LENGTH,
} from "../constants.ts";
import BlockEntry from "./BlockEntry.ts";
import { pixelPrinter, positionPrinter } from "./ImagePrinter.ts";
import { fetchImage, handlePaletteInput } from "../_utils.ts";
import Addon from "./Addon.ts";
import { constructDecoded, constructPositioned } from "./structure.ts";

export function getPrintablePalette(palette: BlockEntry[]) {
  const filtered = palette.filter(
    ({ printable }: BlockEntry) => printable === true,
  );

  if (filtered.length) {
    return filtered;
  }

  throw Error("No blocks available in palette");
}

export async function printPixelArt(
  addon: Addon,
  palette: BlockEntry[],
  options?: {
    chunks?: number;
  },
) {
  const chunks = Math.max(
    1,
    Math.min(MAX_PRINT_CHUNKS, options?.chunks ?? DEFAULT_PRINT_CHUNKS),
  );

  // Exclude unpalatable blocks
  const printablePalette = getPrintablePalette(palette);

  // Print images in pixel_art directory
  const srcsDir = join(Deno.cwd(), "src", "assets", "pixel_art");

  for await (const entry of walk(srcsDir)) {
    const alignment = <Alignment> basename(dirname(entry.path));

    if (!entry.isFile) {
      continue;
    }

    const fileExt = extname(entry.name);
    const fileUrl = toFileUrl(entry.path);
    const structureName = basename(entry.name, fileExt);

    // if (fileExt === 'psd') {

    // }

    try {
      pixelPrinter(
        addon,
        structureName,
        await fetchImage(fileUrl),
        printablePalette,
        { alignment, chunks },
      );
    } catch (err) {
      console.error(
        'Failed creating pixel art for file %s: "%s"',
        entry.name,
        err,
      );
    }
  }
}

export function printPixelArtDirectory(addon: Addon, res: BlockEntry[]) {
  try {
    const printPalette = getPrintablePalette(res);

    return printPixelArt(addon, printPalette);
  } catch (err) {
    console.error(err);
  }
}

export default async function printer(
  addon: Addon,
  palette: BlockEntry[],
  artSrc?: PaletteInput,
  alignment?: Alignment,
  artSrcId?: string,
) {
  if (palette.length < MIN_PALETTE_LENGTH) {
    throw Error("Can not print pixel art. Palette source is too small.");
  }

  //const tasks: Promise<void>[] = [];
  const name = (artSrcId ?? ART_SOURCE_ID).replace(/\s+/g, "_");

  positionPrinter(addon, name, palette);
  constructPositioned(addon, name, palette);

  if (artSrc) {
    try {
      const img = await handlePaletteInput(artSrc);

      constructDecoded(addon, name, Array.isArray(img) ? img : [img], palette);

      const chunks = Math.min(
        MAX_PRINT_CHUNKS,
        Math.max(1, Math.max(img.width, img.height) / CHUNK_SIZE),
      );

      pixelPrinter(addon, name, img, palette, {
        alignment: alignment ?? "b2b",
        chunks,
      });
    } catch (err) {
      console.log("Failed printing pixel art from input: %s", err);
    }
  }

  // try {
  //   // TODO: Check to see if directory exists or is needed before calling function
  //   const pxArtDir = printPixelArtDirectory(res, materials);

  //   if (pxArtDir !== undefined) {
  //     tasks.push(pxArtDir);
  //   }
  // } catch (err) {
  //   console.log("Failed printing from pixel art directory: %s", err);
  // }

  // if (Deno.env.get("GITHUB_REPOSITORY") !== undefined) {
  //   try {
  //     tasks.push(printStarGazers(res));
  //   } catch (err) {
  //     console.log("Failed printing stargazers: %s", err);
  //   }
  // }

  //return Promise.allSettled(tasks);
}
