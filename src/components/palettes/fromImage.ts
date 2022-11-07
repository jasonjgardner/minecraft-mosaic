import type {
  CreationParameters,
  PaletteInput,
  RGB,
  RGBA,
} from "../../types.d.ts";
import { GIF, Image } from "imagescript/mod.ts";
import HueBlock from "../blocks/HueBlock.ts";
import ImageBlock from "../blocks/ImageBlock.ts";
import { handlePaletteInput, rgbaMatch } from "../../_utils.ts";
import { CHUNK_SIZE, DEFAULT_SLICE_SIZE } from "../../constants.ts";

/**
 * Minimum pixel alpha value to allow in palette
 */
const MIN_ALPHA = Math.round(255 * 0.5);

/**
 * Max palette size = RGBA channel values permutations (RGB 0-255 + Acceptable alpha range)
 */
const MAX_PALETTE_SIZE = Math.floor(256 ** 3 + MIN_ALPHA);

/**
 * Maximum width
 */
const BOUNDARY_X = 256;

/**
 * Maximum height
 */
const BOUNDARY_Y = 256;

/**
 * Maximum number of GIF frames to process into palette
 */
const MAX_FRAME_DEPTH = 10;

function createFlipbooks(blocks: ImageBlock[]) {
  const blockSource = blocks[0].texture;

  const flipbook = new Image(
    blockSource.width,
    blockSource.height * blocks.length,
  );

  for (let itr = 0; itr < blocks.length; itr++) {
    const texture = blocks[itr].texture as Image;
    flipbook.composite(
      texture,
      0,
      itr * blockSource.height,
    );
  }

  const flipbookEntry = new ImageBlock(
    flipbook,
    [0, 0, 0],
    blocks[0].position,
    {
      en_US: `Flipbook ${blocks[0].title("en_US")}`,
      en_GB: `Flipbook ${blocks[0].title("en_GB")}`,
    },
  );

  flipbookEntry.mer = blocks[0].mer;
  flipbookEntry.normal = blocks[0].normal;

  return flipbookEntry;
}

export async function getSlices(
  params: CreationParameters["slices"],
  src: Extract<string, PaletteInput>,
  merSource?: string,
  normalSource?: string,
): Promise<ImageBlock[]> {
  const input = await handlePaletteInput(src);

  const frames = (input instanceof GIF ? input : [input]);

  if (frames.length > MAX_FRAME_DEPTH) {
    frames.length = MAX_FRAME_DEPTH;
  }
  const mer = merSource
    ? ((await handlePaletteInput(merSource)) as Image)
    : undefined;
  const normal = normalSource
    ? ((await handlePaletteInput(normalSource)) as Image)
    : undefined;

  const { canvasSize, sliceCount } = params ?? {
    canvasSize: frames[0].width,
    sliceCount: DEFAULT_SLICE_SIZE,
  };

  const sliceSize = Math.ceil(canvasSize / sliceCount);
  const slices: Array<ImageBlock> = [];

  const flipbookBlocks: { [key: string]: ImageBlock[] } = {};

  let zItr = 0;
  frames.forEach((frame) => {
    const { width, height } = frame;

    let positionXitr = 0;
    for (let xItr = 0; xItr < width; xItr += sliceSize) {
      let positionYitr = 0;
      for (let yItr = 0; yItr < height; yItr += sliceSize) {
        const frameTexture = frame.clone().crop(
          xItr,
          yItr,
          sliceSize,
          sliceSize,
        );

        const block = new ImageBlock(
          frameTexture,
          [xItr, yItr, sliceSize],
          [positionXitr, positionYitr, zItr],
          {
            en_US: `X${positionXitr} Y${positionYitr} Z${zItr}`,
            en_GB: `X${positionXitr} Y${positionYitr} Zed${zItr}`,
          },
        );

        if (zItr < 1 && mer) {
          block.mer = mer.clone().crop(xItr, yItr, sliceSize, sliceSize);
        }

        if (zItr < 1 && normal) {
          block.normal = normal.clone().crop(xItr, yItr, sliceSize, sliceSize);
        }

        //slices.push(block);
        flipbookBlocks[`${positionXitr},${positionYitr}`] ??= [];
        flipbookBlocks[`${positionXitr},${positionYitr}`].push(block);

        positionYitr++;
      }
      positionXitr++;
    }
    zItr++;
  });

  for (const key in flipbookBlocks) {
    const flipbook = createFlipbooks(flipbookBlocks[key]);
    slices.push(flipbook);
  }

  return slices;
}

export async function getPalette(
  src: Extract<string, PaletteInput>,
): Promise<HueBlock[]> {
  const colors: RGBA[] = [];
  const input = await handlePaletteInput(src);
  // Resize large images
  if (input.height > BOUNDARY_Y) {
    console.log("Resizing input height");
    input.resize(Image.RESIZE_AUTO, BOUNDARY_Y, Image.RESIZE_NEAREST_NEIGHBOR);
  }

  if (input.width > BOUNDARY_X) {
    console.log("Resizing input width");
    input.resize(BOUNDARY_X, Image.RESIZE_AUTO, Image.RESIZE_NEAREST_NEIGHBOR);
  }

  const frames = input instanceof GIF ? input : [input];
  const frameCount = frames.length;
  const fuzzRange = [255 / 15, 255 / 15, 255 / 15, 255 / 50];

  let itr = Math.min(frameCount, MAX_FRAME_DEPTH);

  // Collect colors from each frame
  while (itr--) {
    const img = frames[itr];

    for (const [_x, _y, c] of img.iterateWithColors()) {
      const color = <RGBA> Image.colorToRGBA(c);
      // Add to palette if the color is above the minimum alpha level
      // and if its RGBA values do not exactly match any existing colors
      if (
        color[3] > MIN_ALPHA &&
        (!colors.length ||
          !colors.some((existingColor) =>
            rgbaMatch(existingColor, color, fuzzRange)
          ))
      ) {
        colors.push(color);
      }
    }
  }

  if (colors.length > MAX_PALETTE_SIZE) {
    colors.length = MAX_PALETTE_SIZE;
    console.log("Palette size has been truncated.");
    // TODO: Set average and dominate colors as array entries when palette is too large? (MAX_PALETTE_SIZE - 2)
  }
  return colors.map((color: RGBA) => new HueBlock(color));
}
