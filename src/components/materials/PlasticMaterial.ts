import Material from "../Material.ts";

export default class Plastic extends Material {
  _useHeightMap = false;

  _normalMap = "block_normal";
  constructor() {
    super("glossy", {
      en_US: "Glossy Plastic",
      en_GB: "Glossy Plastic",
    });
  }

  get emissive() {
    return 0;
  }

  get metalness() {
    return 0;
  }

  get roughness() {
    return Math.floor(255 * 0.25);
  }

  get components() {
    return {
      // "minecraft:creative_category": {
      //   category: "construction",
      //   group: "itemGroup.name.concrete",
      // },
      //"minecraft:unit_cube": Object.freeze({}),
      "minecraft:material_instances": this.materialInstance,
      //"minecraft:block_light_filter":
      //"minecraft:block_light_emission": 0,
    };
  }
}
