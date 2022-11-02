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

type Coordinates = [number, number, number?];

let sliceId = 0;

export default class ImageBlock implements IBlockTexture {
  _img!: Image | Frame;
  _name!: MultiLingual;

  _color!: RGBA;

  _position!: Coordinates;
  constructor(
    img: Image | Frame,
    position?: Coordinates,
    name?: MultiLingual,
  ) {
    this._img = img;

    this._name = name ?? {
      en_US: `Slice ${++sliceId}`,
      en_GB: `Slice ${sliceId}`,
    };

    this._color = <RGBA> Image.colorToRGBA(img.dominantColor());

    this._position = <Coordinates> position?.slice(
      0,
      3,
    ) ?? [0, 0, 0];
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

  get texture() {
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
}
