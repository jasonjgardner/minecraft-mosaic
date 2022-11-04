import type {
  FlipbookComponent,
  LanguageId,
  LanguagesContainer,
  MinecraftData,
  MinecraftTerrainData,
  PackSizes,
} from "../types.d.ts";
import type Material from "./Material.ts";
import { Image } from "imagescript/mod.ts";
import { sprintf } from "fmt/printf.ts";
import { DEFAULT_PACK_SIZE, TEXTURE_SET_FORMAT_VERSION } from "../constants.ts";
import BlockEntry from "./BlockEntry.ts";
import FlipbookEntry, { formatFlipbookName } from "./FlipbookEntry.ts";
import { getMaterials } from "./materials/index.ts";
import { addToBehaviorPack, addToResourcePack } from "./_state.ts";
function flipbookData(
  flipbookBlock: FlipbookEntry,
  frameCount: number,
): FlipbookComponent {
  addToResourcePack(
    `textures/blocks/${flipbookBlock.id}.texture_set.json`,
    JSON.stringify(
      {
        format_version: TEXTURE_SET_FORMAT_VERSION,
        "minecraft:texture_set": flipbookBlock.textureSet,
      },
    ),
  );

  addToBehaviorPack(
    `blocks/${flipbookBlock.id}.json`,
    flipbookBlock.toString(),
  );

  const flipbookFrames: number[] = [];
  const startIdx = Math.round(frameCount * 0.5);

  for (let itr = startIdx; itr < frameCount; itr++) {
    flipbookFrames.push(itr);
  }

  for (let itr = 1; itr < startIdx; itr++) {
    flipbookFrames.push(itr);
  }

  return {
    flipbook_texture: `textures/blocks/${flipbookBlock.id}`,
    frames: flipbookFrames,
    atlas_tile: flipbookBlock.id,
    ticks_per_frame: 1, //Math.floor(frameCount * 1.666),
    blend_frames: false,
  };
}

export async function makeAtlas(blocks: BlockEntry[], size?: PackSizes) {
  const frameCount = blocks.length;
  const s = size || DEFAULT_PACK_SIZE;
  const atlasOutput = new Image(s, s * frameCount);

  // Create atlas frames
  for (let itr = 0; itr < frameCount; itr++) {
    atlasOutput.composite(<Image> blocks[itr].color.texture, 0, itr * s);

    // Join frames into single image
  }

  return await atlasOutput.encode(0);
}

export async function writeFlipbooks(
  frames: BlockEntry[],
  dependencies: {
    namespace: string;
    blocksData: MinecraftData;
    textureData: MinecraftTerrainData;
    languages: LanguagesContainer;
  },
): Promise<[MinecraftData, MinecraftTerrainData, LanguagesContainer]> {
  const { blocksData, textureData, languages, namespace } = dependencies;
  const frameCount = frames.length;
  const lastBlock = frames[frameCount - 1];

  addToResourcePack(
    `textures/blocks/${formatFlipbookName(lastBlock.color.name)}.png`,
    await makeAtlas(frames),
  );

  const materials = getMaterials();

  addToResourcePack(
    "textures/flipbook_textures.json",
    JSON.stringify(
      materials.map(
        (material: Material) => {
          const flipbookBlock = new FlipbookEntry(
            namespace,
            lastBlock.color,
            material,
          );
          blocksData[flipbookBlock.behaviorId] = flipbookBlock.blocksData;
          textureData[flipbookBlock.resourceId] = flipbookBlock.terrainData;

          for (const languageKey in languages) {
            languages[<LanguageId> languageKey].push(
              sprintf(
                "tile.%s.name=%s",
                flipbookBlock.behaviorId,
                flipbookBlock.title(<LanguageId> languageKey),
              ),
            );
          }

          return flipbookData(
            flipbookBlock,
            frameCount,
          );
        },
      ),
    ),
  );

  return [blocksData, textureData, languages];
}
