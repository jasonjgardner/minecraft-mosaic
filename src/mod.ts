import "dotenv/load.ts";

import type { CreationParameters, IBlockTexture, PackIDs } from "./types.d.ts";
import { DEFAULT_DESCRIPTION } from "./constants.ts";
import BlockEntry from "./components/BlockEntry.ts";
import { getBlocks, HueBlock, ImageBlock } from "./components/blocks/index.ts";
import Material from "./components/Material.ts";
import { getMaterials } from "./components/materials/index.ts";
//import createFunctions from "/src/components/mcfunctions/index.ts";
import { generatePackIcon, getDefaultIcon } from "./components/packIcon.ts";
import { createManifests } from "./components/manifest.ts";
import printer from "./components/printer.ts";
import {
  addBlock,
  addToBehaviorPack,
  addToResourcePack,
  createArchive,
} from "./components/_state.ts";

// Join base textures with PBR materials
function compileMaterials(
  namespace: string,
  baseTextures: IBlockTexture[],
  materials: Material[],
) {
  const res: BlockEntry[] = [];
  materials.forEach((material: Material) => {
    baseTextures.forEach((base: IBlockTexture) => {
      res.push(new BlockEntry(namespace, base, material));
    });
  });

  return res;
}

export default async function createAddon(
  uuids: PackIDs,
  {
    size,
    namespace,
    description,
    blocks,
    materialOptions,
    pixelArtSource,
    pixelArtSourceName,
    animationAlignment,
  }: CreationParameters,
) {
  if (!blocks || !blocks.length) {
    console.log("Default palette will be used");
  }

  const res: BlockEntry[] = [];

  const imgBlocks = ((blocks?.filter((block) => block instanceof ImageBlock)) ||
    []) as ImageBlock[];
  const hueBlocks = (blocks?.filter((block) => block instanceof HueBlock) ??
    getBlocks()) as HueBlock[];

  const materials = materialOptions && materialOptions.length
    ? materialOptions
    : getMaterials();

  res.push(
    ...compileMaterials(namespace, [...imgBlocks, ...hueBlocks], materials),
  );

  try {
    const packIcon = pixelArtSource
      ? await generatePackIcon(namespace, pixelArtSource)
      : await getDefaultIcon();

    addToResourcePack("pack_icon.png", packIcon);
    addToBehaviorPack("pack_icon.png", packIcon);
  } catch (err) {
    console.log("Failed adding pack icons: %s", err);
  }

  // TODO: Add description input
  createManifests(uuids, namespace, description ?? DEFAULT_DESCRIPTION);

  await Promise.all(res.map((block: BlockEntry) => addBlock(block, size)));

  //createFunctions();

  try {
    await printer(
      res,
      pixelArtSource,
      animationAlignment,
      pixelArtSourceName ?? namespace,
    );
  } catch (err) {
    console.warn("Failed creating pixel art functions: %s", err);
  }

  return createArchive(namespace, size);
}
