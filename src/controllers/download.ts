import type { CreationParameters } from "../types.d.ts";
import type Material from "../components/Material.ts";
import { DEFAULT_NAMESPACE, DEFAULT_PACK_SIZE } from "../constants.ts";
import { sanitizeNamespace } from "../_utils.ts";
import getPalette from "../components/palettes/fromImage.ts";
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

export default async function download({
  pixelArtSource,
  pixelArtSourceName,
  namespace,
  size,
  animationAlignment,
}: CreationParameters, materialIds?: string) {
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

  let blockColors = materialPalette;

  if (pixelArtSource) {
    try {
      blockColors = await getPalette(pixelArtSource);
    } catch (err) {
      console.log("Failed extracting color palette: %s", err);
    }
  }

  return createAddon([
    crypto.randomUUID(),
    crypto.randomUUID(),
    crypto.randomUUID(),
    crypto.randomUUID(),
  ], {
    namespace: ns.length > 1 ? ns : DEFAULT_NAMESPACE,
    size: size || DEFAULT_PACK_SIZE,
    pixelArtSource,
    pixelArtSourceName,
    blockColors,
    materialOptions,
    animationAlignment,
  });
}