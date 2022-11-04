import type {
  Axis,
  IBlockTexture,
  LanguageId,
  MinecraftData,
  MultiLingual,
  RGBA,
} from "../../types.d.ts";
import { Frame, Image } from "imagescript/mod.ts";
import { labelLanguage } from "../BlockEntry.ts";
import { hexValue } from "../../_utils.ts";
import { sprintf } from "fmt/printf.ts";
import { MIN_ALPHA } from "../../constants.ts";

type Coordinates = [number, number, number?];

export default class ImageBlock implements IBlockTexture {
  _img!: Image | Frame;
  _name!: MultiLingual;

  _color!: RGBA;

  _position!: Coordinates;

  _size!: number;
  constructor(
    img: Image | Frame,
    position?: Coordinates,
    name?: MultiLingual,
  ) {
    this._position = <Coordinates> position?.slice(
      0,
      3,
    ) ?? [0, 0, 0];

    this._img = img;

    this._name = name ?? {
      en_US: sprintf("Slice X%d Y%d Z%d", ...this.position),
      en_GB: sprintf("Slice X%d Y%d Z%d", ...this.position),
    };

    this._color = <RGBA> Image.colorToRGBA(img.dominantColor());
  }

  title(lang: LanguageId = "en_US") {
    return this._name[lang];
  }

  orientation(axis: Axis) {
    if (axis === "y") {
      // When going north to south, x and z are swapped
      return [this.position[2], this.position[1], this.position[0]];
    }
    if (axis === "z") {
      return [this.position[0], this.position[2], this.position[1]];
    }

    // When going east to west, x, y and z remain the same
    return this.position;
  }

  get name() {
    return this.title(labelLanguage).trim().replaceAll(/\s+/g, "_");
  }

  get texture(): Image | Frame {
    return this._img;
  }

  get textureSet() {
    return {
      color: this._img,
    };
  }

  get components(): MinecraftData {
    return {
      "minecraft:map_color": "#" +
        this.hex.replace(
          "#",
          "",
        ).substring(0, 6),
    };
  }

  get hex() {
    return `${hexValue(this._color)}`;
  }

  get rgba() {
    return this._color;
  }

  get position() {
    return this._position;
  }

  /**
   * Check if any of the pixels in the image are transparent
   */
  get isTranslucent() {
    for (const [, , c] of this._img.iterateWithColors()) {
      const color = Image.colorToRGBA(c);

      if (color[3] < 255) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if the entire image is made of transparent pixels
   */
  get isTransparent() {
    for (const [, , c] of this._img.iterateWithColors()) {
      const color = Image.colorToRGBA(c);

      if (color[3] > MIN_ALPHA) {
        return false;
      }
    }
    return true;
  }
}
