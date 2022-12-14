import HueBlock from "../blocks/HueBlock.ts";
export default function generateSrgbBlocks(step: number) {
  step = Math.max(1, Math.min(255, Math.abs(step)));
  const blocks: HueBlock[] = [];
  for (let r = 0; r <= 255; r += step) {
    for (let g = 0; g <= 255; g += step) {
      for (let b = 0; b <= 255; b += step) {
        const title = `R${r} G${g} B${b}`;
        blocks.push(new HueBlock([r, g, b], { en_US: title, en_GB: title }));
      }
    }
  }

  return blocks;
}
