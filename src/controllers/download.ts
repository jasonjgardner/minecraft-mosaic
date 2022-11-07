import type { CreationParameters, PackSizes } from "../types.d.ts";
import type Material from "../components/Material.ts";
import type { IBlockTexture } from "../types.d.ts";
import { DEFAULT_NAMESPACE, DEFAULT_PACK_SIZE } from "../constants.ts";
import { getPackIds, sanitizeNamespace } from "../_utils.ts";
import { getPalette, getSlices } from "../components/palettes/fromImage.ts";
import materialPalette from "../components/palettes/materialDesign.ts";
import PlasticMaterial from "../components/materials/PlasticMaterial.ts";
import GlowingMaterial from "../components/materials/GlowingMaterial.ts";
import MetalMaterial from "../components/materials/MetalMaterial.ts";
import MattePlasticMaterial from "../components/materials/MattePlasticMaterial.ts";
import RoughMetalMaterial from "../components/materials/RoughMetalMaterial.ts";
import createAddon from "../mod.ts";

const materialLibrary: { [k: string]: () => Material } = {
  plastic: () => new PlasticMaterial(),
  glowing: () => new GlowingMaterial(),
  metal: () => new MetalMaterial(),
  matte_plastic: () => new MattePlasticMaterial(),
  rough_metal: () => new RoughMetalMaterial(),
} as const;

function materialFactory(materialIds: string[]): Material[] {
  const res: Material[] = [];

  materialIds.forEach((id) => {
    if (id in materialLibrary) {
      res.push(materialLibrary[id]());
    }
  });

  return res;
}

function getBlockPalette(
  pixelArtSource?: string,
  merSource?: string,
  normalSource?: string,
  slices?: CreationParameters["slices"],
) {
  if (!pixelArtSource) {
    return materialPalette;
  }

  return slices
    ? getSlices(slices, pixelArtSource, merSource, normalSource)
    : getPalette(pixelArtSource);
}

export default async function download({
  pixelArtSource,
  pixelArtSourceName,
  merSource,
  normalSource,
  namespace,
  animationAlignment,
  slices,
}: CreationParameters, materialIds?: string) {
  // TODO: Generate namespace before falling back to default
  const ns = sanitizeNamespace(
    namespace ?? pixelArtSource ?? DEFAULT_NAMESPACE,
  );

  // Include all materials if no IDs are specified
  const materialOptions = materialFactory(
    materialIds ? materialIds.split(",") : Object.keys(materialLibrary),
  );

  if (!materialOptions.length) {
    materialOptions.push(new PlasticMaterial());
  }

  let blocks: Array<IBlockTexture> = materialPalette;

  try {
    if (pixelArtSource) {
      blocks = await getBlockPalette(
        pixelArtSource,
        merSource,
        normalSource,
        slices,
      );
    }
  } catch (err) {
    console.log("Failed extracting color palette: %s", err);
  }

  return createAddon(getPackIds(), {
    namespace: ns.length > 0 ? ns : DEFAULT_NAMESPACE,
    size: (slices?.textureSize || DEFAULT_PACK_SIZE) as PackSizes,
    pixelArtSource,
    pixelArtSourceName,
    blocks,
    materialOptions,
    animationAlignment,
    slices,
  });
}
