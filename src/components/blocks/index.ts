import HueBlock from "../blocks/HueBlock.ts";
export { HueBlock };
export { default as ImageBlock } from "../blocks/ImageBlock.ts";

//import srgb from '/src/components/palettes/srgb.ts'
import defaultPalette from "../palettes/default.ts";

export function getBlocks(): HueBlock[] {
  return defaultPalette();
}
