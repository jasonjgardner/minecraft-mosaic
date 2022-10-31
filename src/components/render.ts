import type { PackSizes } from "../types.d.ts";
import { Image } from "imagescript/mod.ts";

export function renderBlock(color: number[], size: PackSizes) {
  const [r, g, b, a] = color.slice(0, 4);

  const imgOutput = new Image(size, size);
  imgOutput.fill(Image.rgbaToColor(r, g, b, a));

  return imgOutput.encode(0);
}

export function renderDot(color: number[], size: PackSizes) {
  const [r, g, b, a] = color.slice(0, 4);

  const imgOutput = new Image(size, size);
  imgOutput.fill(Image.rgbaToColor(0, 0, 0, 1));
  imgOutput.drawCircle(0, 0, size, Image.rgbaToColor(r, g, b, a));

  return imgOutput.encode(0);
}

export function renderBorderSvg(
  fill: string,
  borderFill: string,
  size: PackSizes,
) {
  const innerSize = Math.ceil(size * 0.9375);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg id="block" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="15" height="15" style="fill: ${fill};"/>
  <polygon points="${size} 0 ${innerSize} 0 ${innerSize} ${innerSize} 0 ${innerSize} 0 ${size} ${size} ${size} ${size} 0 ${size} 0" style="fill: ${borderFill};"/>
</svg>`;
  const imgOutput = Image.renderSVG(svg, size, Image.SVG_MODE_WIDTH);

  return imgOutput.encode(0);
}
