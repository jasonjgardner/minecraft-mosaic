import type { RGBA } from "../types.d.ts";
import { Frame, GIF, Image } from "imagescript/mod.ts";
import { encode, Int } from "https://deno.land/x/nbtrex@1.3.0/mod.ts";
import { BLOCK_ENGINE_VERSION, TRANSPARENT_PRINT_BLOCK } from "../constants.ts";
import BlockEntry from "./BlockEntry.ts";
import { getBlockIdByColor } from "./ImagePrinter.ts";
import Addon from "./Addon.ts";
import ImageBlock from "./blocks/ImageBlock.ts";

export function createStructureTag() {
  const block_palette: Array<{ version: Int; name: string }> = [];
  return {
    format_version: new Int(1),
    size: [new Int(1), new Int(1), new Int(1)],
    structure_world_origin: [new Int(0), new Int(0), new Int(0)],
    structure: {
      block_indices: [[new Int(0), new Int(0), new Int(0)], [
        new Int(-1),
        new Int(-1),
        new Int(-1),
      ]],
      entities: [],
      palette: {
        default: {
          block_palette,
          block_position_data: {},
        },
      },
    },
  };
}

function placeBlock(name: string) {
  return {
    version: new Int(BLOCK_ENGINE_VERSION),
    name,
    states: {},
  };
}

export function constructDecoded(
  addon: Addon,
  name: string,
  frames: GIF | Array<Image | Frame>,
  palette: BlockEntry[],
) {
  const structureTag = createStructureTag();

  const frameCount = frames.length;
  const positionData = [];
  const layer = [];
  const layerDims: Array<number[]> = [];
  let idx = 0;

  for (let z = 0; z < frameCount; z++) {
    const img = frames[z];

    for (const [x, y, c] of img.iterateWithColors()) {
      layer.push([new Int(z), new Int(y), new Int(x)]);
      layerDims.push([z, y, x]);

      structureTag.structure.palette.default.block_palette.push(
        placeBlock(getBlockIdByColor(
          <RGBA> Image.colorToRGBA(c),
          palette,
        )),
      );

      positionData.push([idx, { block_entity_data: {} }]);

      idx++;
    }
  }

  structureTag.structure.palette.default.block_position_data = Object
    .fromEntries(
      positionData,
    );

  structureTag.size = [
    new Int(Math.max(...layerDims.map(([, , x]) => x)) + 1),
    new Int(Math.max(...layerDims.map(([, y]) => y)) + 1),
    new Int(frameCount),
  ];

  structureTag.structure.block_indices[0].push(...layer.flat());

  return addon.addToBehaviorPack(
    `structures/${name}.mcstructure`,
    new Uint8Array(encode(null, structureTag)),
  );
}

export function constructPositioned(
  addon: Addon,
  name: string,
  palette: BlockEntry[],
) {
  const structureTag = createStructureTag();
  const layer: Array<Int[]> = [];
  const layerDims: Array<number[]> = [];
  const positionData: Array<
    [number, { block_entity_data: Record<never, never> }]
  > = [];

  let maxZ = 0;
  let idx = 0;
  palette.forEach(({ color, behaviorId, material: { label } }) => {
    if (!(color instanceof ImageBlock)) {
      return;
    }

    // FIXME: Don't allow overlapping materials

    const fillWith = color.isTransparent ? TRANSPARENT_PRINT_BLOCK : behaviorId;
    const [z, y, x] = color.orientation("z");

    layer.push([
      new Int(z ?? color.position[2] ?? 0),
      new Int(y ?? color.position[1]),
      new Int(x ?? color.position[0]),
    ]);
    layerDims.push([z ?? 1, y ?? 1, x ?? 1]);

    structureTag.structure.palette.default.block_palette.push(
      placeBlock(fillWith),
    );

    positionData.push([idx, { block_entity_data: {} }]);

    if (z && z > maxZ) {
      maxZ = z;
    }

    idx++;
  });

  structureTag.structure.palette.default.block_position_data = Object
    .fromEntries(
      positionData,
    );

  structureTag.size = [
    new Int(Math.max(...layerDims.map(([, , x]) => x)) + 1),
    new Int(Math.max(...layerDims.map(([, y]) => y)) + 1),
    new Int(maxZ),
  ];

  structureTag.structure.block_indices[0].push(...layer.flat());

  return addon.addToBehaviorPack(
    `structures/${name}.mcstructure`,
    new Uint8Array(encode("root", structureTag)),
  );
}
