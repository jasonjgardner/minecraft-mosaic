import { MIN_ALPHA } from "../../constants.ts";
import type {
  IBlockTexture,
  LanguageId,
  MinecraftData,
  MultiLingual,
  RGB,
  RGBA,
  TextureSet,
} from "../../types.d.ts";
import { hexValue } from "../../_utils.ts";
import { labelLanguage } from "../BlockEntry.ts";
import { Image } from "imagescript/mod.ts";

export default class HueBlock implements IBlockTexture {
  _color!: RGBA;
  _name?: MultiLingual;

  _renderMethod: "alpha_test" | "blend" | "opaque" = "opaque";
  constructor(
    color: RGB | RGBA,
    name?: MultiLingual,
    renderMethod?: "alpha_test" | "blend" | "opaque",
  ) {
    if (color.length < 4) {
      color[3] = 255;
    }

    this._color = <RGBA> color;
    this._name = name;

    this.renderMethod = renderMethod ?? this.isTransparent
      ? "alpha_test"
      : this.isTranslucent
      ? "blend"
      : "opaque";
  }

  title(lang: LanguageId = "en_US") {
    return this._name
      ? this._name[lang]
      : hexValue(this._color).replace("#", "").toUpperCase();
  }

  get texture(): Image {
    const img = new Image(16, 16);
    img.fill(Image.rgbaToColor(...this.rgba));
    return img;
  }

  get name() {
    return this.title(labelLanguage).trim().replaceAll(/\s+/g, "_");
  }

  get hex() {
    return `${hexValue(this._color)}`;
  }

  get rgba() {
    return this._color;
  }

  get textureSet(): TextureSet {
    return {
      color: this._color,
    };
  }

  get components(): MinecraftData {
    return {
      //...formatTag(this.name),
      "minecraft:map_color": "#" +
        hexValue(this._color).replace("#", "").substring(
          0,
          6,
        ),
    };
  }

  set renderMethod(value: "alpha_test" | "blend" | "opaque") {
    this._renderMethod = value;
  }

  get renderMethod() {
    return this._renderMethod;
  }

  get isTranslucent() {
    return this._color[3] < 255;
  }

  get isTransparent() {
    return this._color[3] < MIN_ALPHA;
  }
}
