import type {
  BlockComponents,
  IBlockTexture,
  IPermutation,
  LanguageId,
  MinecraftData,
  MinecraftEvent,
  TextureSet,
} from "../types.d.ts";
import {
  BEHAVIOR_BLOCK_FORMAT_VERSION,
  DEFAULT_NAMESPACE,
  LABEL_BLOCK_EVENT,
  LABEL_BLOCK_PROPERTY,
} from "../constants.ts";
import { sprintf } from "fmt/printf.ts";
import { deepMerge } from "collections/mod.ts";
import { sanitizeNamespace } from "../_utils.ts";
import Material from "./Material.ts";

export const labelLanguage: LanguageId = "en_US";

export default class BlockEntry {
  _namespace!: string;
  _id!: string;

  _hue!: IBlockTexture;

  _material!: Material;

  _permutations?: IPermutation[];

  _printable?: boolean;

  _customGeometry?: string;

  constructor(
    namespace: string,
    block: IBlockTexture,
    material: Material,
  ) {
    this.namespace = namespace;
    this._hue = block;
    this._material = material;
  }

  set namespace(value: string) {
    this._namespace = sanitizeNamespace(value);
  }

  get namespace() {
    return this._namespace ?? DEFAULT_NAMESPACE;
  }

  set printable(value: boolean) {
    this._printable = value;
  }

  get printable() {
    return this._printable !== false;
  }
  get color() {
    return this._hue;
  }

  get material() {
    return this._material;
  }

  get id() {
    const hash = this.namespace.slice(0, 2).trim();
    return sprintf("%s%s_%s", hash, this._material.label, this._hue.name)
      .toLowerCase();
  }

  get behaviorId() {
    return sprintf("%s:%s", this.namespace, this.id);
  }

  get resourceId() {
    return sprintf("%s_%s", this.namespace, this.id);
  }

  title(lang: LanguageId) {
    return sprintf(
      "%s %s",
      this._material.title(lang),
      this._hue.title(lang),
    );
  }

  language(lang: LanguageId) {
    return sprintf(
      "tile.%s.name=%s",
      this.behaviorId,
      this.title(lang),
    );
  }

  get name() {
    return this.title(labelLanguage);
  }

  get textureSet(): TextureSet {
    return <TextureSet> deepMerge(
      this._material.textureSet,
      this._hue.textureSet,
    );
  }

  get blocksData() {
    return deepMerge({
      textures: this.resourceId,
    }, this._material.blocksData);
  }

  get terrainData() {
    return {
      textures: `textures/blocks/${this.resourceId}`,
    };
  }

  get permutations(): IPermutation[] | [] {
    return this._permutations || [];
  }

  formatEvent(
    { name, events }: IPermutation,
  ): [string, MinecraftEvent] {
    return [
      sprintf("%s:%s_%s", this.namespace, name, LABEL_BLOCK_EVENT),
      events,
    ];
  }

  formatProperty(
    { name, properties }: IPermutation,
  ): [string, MinecraftData] {
    return [
      sprintf("%s:%s%s", this.namespace, name, LABEL_BLOCK_PROPERTY),
      properties,
    ];
  }

  get block() {
    const permutes = this.permutations.filter(({ enabled }: IPermutation) =>
      enabled !== false
    );

    const block: BlockComponents = {
      description: {
        identifier: this.behaviorId,
        is_experimental: permutes.some((
          { experimental }: IPermutation,
        ) => experimental === true),
        register_to_creative_menu: "minecraft:creative_category" in
            this.components ||
          this.permutations.some(({ permutations }: IPermutation) =>
            permutations.filter((
              { ["minecraft:creative_category"]: category },
            ) => category !== undefined)
          ),
        properties: {},
      },
      components: this.components,
      events: {},
      permutations: [],
    };

    if (permutes.length) {
      block.description.properties = Object.fromEntries(
        permutes.map((p) => this.formatProperty(p)),
      );
      block.events = Object.fromEntries(
        permutes.map((p) => this.formatEvent(p)),
      );

      block.permutations = permutes.flatMap((
        { permutations }: IPermutation,
      ) => permutations);
    }

    return block;
  }

  toString() {
    return JSON.stringify(
      {
        format_version: BEHAVIOR_BLOCK_FORMAT_VERSION,
        "minecraft:block": this.block,
      },
    );
  }

  get customGeometry(): string | undefined {
    return this._customGeometry;
  }

  set customGeometry(modelName: string | undefined) {
    this._customGeometry = modelName
      ? modelName.replace(/\.geo\.json$/, "")
      : undefined;
  }

  get materialInstances() {
    return deepMerge({
      "this_texture": {
        texture: this.resourceId,
        render_method: this.color.renderMethod,
      },
      "*": "this_texture",
    }, this._material.materialInstance);
  }

  get components() {
    const components = deepMerge(
      {
        "minecraft:material_instances": this.materialInstances,
      },
      deepMerge(this.color.components, this._material.components),
    );

    if (this.customGeometry) {
      components["minecraft:geometry"] = this.customGeometry;
    } else {
      components["minecraft:unit_cube"] = {};
    }

    return components;
  }

  get translucent() {
    return this.color.isTranslucent && this._material.translucent !== false;
  }
}
