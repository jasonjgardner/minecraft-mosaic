import type {
  LanguageId,
  LanguagesContainer,
  MinecraftData,
  MinecraftTerrainData,
  PackSizes,
} from "../types.d.ts";
import type BlockEntry from "./BlockEntry.ts";
import { COMPRESSION_LEVEL, TEXTURE_SET_FORMAT_VERSION } from "../constants.ts";
import { EOL } from "fs/mod.ts";
import { join } from "path/mod.ts";
import { JSZip } from "jszip/mod.ts";
import { Frame, Image } from "imagescript/mod.ts";
import { calculateMipLevels } from "./_resize.ts";
import { renderBlock } from "./render.ts";
import { hex2rgb } from "../_utils.ts";

export default class Addon {
  _zip!: JSZip;
  _blocksJson: MinecraftData = {};
  _textureData: MinecraftTerrainData = {};
  _flipbooksJson: Array<
    { [key: string]: string | number[] | number | boolean }
  > = [];
  _languages: LanguagesContainer = {
    en_US: [],
    en_GB: [],
  };

  constructor() {
    this._zip = new JSZip();
    this._flipbooksJson = [];
  }

  get resourcePack() {
    return this._zip.folder("rp");
  }

  get behaviorPack() {
    return this._zip.folder("bp");
  }

  static sanitizeFilename(filepath: string) {
    return filepath.trim().toLowerCase().replaceAll(/\s+/g, "_");
  }

  async addTextureSet(block: BlockEntry, size: PackSizes) {
    const textureSet = { ...block.textureSet };
    const isColor = (color: string | number[] | Image | Frame) =>
      color && !(color instanceof Image || color instanceof Frame) &&
      (`${color}`[0] === "#" || Array.isArray(color));

    if (isColor(textureSet.color)) {
      // Render and rewrite color texture
      textureSet.color = (await this.addColorTexture(block, size)) ??
        textureSet.color;
    } else if (
      textureSet.color instanceof Image || textureSet.color instanceof Frame
    ) {
      // Add color texture
      this.resourcePack.folder("textures/blocks").addFile(
        Addon.sanitizeFilename(`${block.resourceId}.png`),
        await textureSet.color.resize(size, Image.RESIZE_AUTO).encode(
          COMPRESSION_LEVEL,
        ),
      );

      if (textureSet.color.height > textureSet.color.width) {
        this.addFlipbook(block);
      }
      textureSet.color = block.resourceId;
    } else {
      await this.requireMaterialAsset(`${textureSet.color}`, size);
    }

    if (
      textureSet.metalness_emissive_roughness instanceof Image
    ) {
      // Add mer texture
      this.resourcePack.folder("textures/blocks").addFile(
        Addon.sanitizeFilename(`${block.resourceId}_mer.png`),
        await textureSet.metalness_emissive_roughness.resize(
          size,
          Image.RESIZE_AUTO,
        ).encode(
          COMPRESSION_LEVEL,
        ),
      );
      textureSet.metalness_emissive_roughness = `${block.resourceId}_mer`;
    } else if (
      textureSet.metalness_emissive_roughness !== undefined &&
      !isColor(textureSet.metalness_emissive_roughness || "")
    ) {
      await this.requireMaterialAsset(
        `${textureSet.metalness_emissive_roughness}`,
        size,
      );
    }

    if (
      textureSet.normal instanceof Image
    ) {
      const filename = Addon.sanitizeFilename(`${block.resourceId}_normal`);
      this.resourcePack.folder("textures/blocks").addFile(
        `${filename}.png`,
        await textureSet.normal.resize(size, Image.RESIZE_AUTO).encode(
          COMPRESSION_LEVEL,
        ),
      );
      textureSet.normal = filename;
    } else if (textureSet.normal !== undefined) {
      await this.requireMaterialAsset(textureSet.normal, size);
    } else if (textureSet.heightmap !== undefined) {
      if (textureSet.heightmap instanceof Image) {
        const filename = Addon.sanitizeFilename(
          `${block.resourceId}_heightmap`,
        );
        // Add heightmap texture
        this.resourcePack.folder("textures/blocks").addFile(
          `${filename}.png`,
          await textureSet.heightmap.resize(size, Image.RESIZE_AUTO).encode(
            COMPRESSION_LEVEL,
          ),
        );
        textureSet.heightmap = filename;
      } else {
        await this.requireMaterialAsset(textureSet.heightmap, size);
      }
    }

    return this.resourcePack.folder("textures/blocks").addFile(
      Addon.sanitizeFilename(`${block.resourceId}.texture_set.json`),
      JSON.stringify({
        format_version: TEXTURE_SET_FORMAT_VERSION,
        "minecraft:texture_set": textureSet,
      }),
    );
  }

  async addBlock(block: BlockEntry, size: PackSizes) {
    this._blocksJson[block.behaviorId] = block.blocksData;
    this._textureData[block.resourceId] = block.terrainData;
    this.behaviorPack.folder("blocks").addFile(
      `${block.id}.json`,
      block.toString(),
    );

    // Get translation for each language
    for (const languageKey in this._languages) {
      this._languages[<LanguageId> languageKey].push(
        block.language(<LanguageId> languageKey),
      );
    }

    await this.requireGeometryAsset(block);

    return this.addTextureSet(block, size);
  }

  async requireGeometryAsset({ components }: BlockEntry) {
    if (typeof components["minecraft:geometry"] !== "string") {
      return;
    }

    try {
      const meshName = components["minecraft:geometry"].replace(
        /^geometry\./i,
        "",
      );
      const fileName = `${meshName}.geo.json`;

      if (this.resourcePack.folder("models/blocks").file(fileName) !== null) {
        console.info(`Geometry "${fileName}" already exists in addon archive.`);
      }

      const filePath = join(Deno.cwd(), "src", "assets", "materials", fileName);

      const contents = await Deno.readTextFile(filePath);
      const json = JSON.parse(contents); // Read and minify contents

      return this.resourcePack.folder("models/blocks").addFile(
        fileName,
        JSON.stringify(json),
      );
    } catch (err) {
      console.error("Failed adding geometry: %s", err);
      throw new Error(
        `Geometry asset "${components["minecraft:geometry"]}" not found`,
      );
    }
  }

  async requireMaterialAsset(name: string, size: PackSizes) {
    const fileName = `${name}.png`;
    const filePath = join(Deno.cwd(), "src", "assets", "materials", fileName);

    try {
      const asset = await Image.decode(await Deno.readFile(filePath));

      // Manipulate the image here:
      asset.resize(size, size);

      this.resourcePack.folder("textures/blocks").addFile(
        fileName,
        await asset.encode(COMPRESSION_LEVEL),
      );
    } catch (err) {
      console.error("Failed adding asset '%s': %s", filePath, err);
    }
  }

  async addColorTexture(
    { resourceId, textureSet: { color } }: BlockEntry,
    size: PackSizes,
  ) {
    const textureName = Addon.sanitizeFilename(`${resourceId}.png`);

    this.resourcePack.folder("textures/blocks").addFile(
      textureName,
      await ((color instanceof Image)
        ? color.encode(COMPRESSION_LEVEL)
        : renderBlock(
          typeof color === "string" ? hex2rgb(color) : color,
          size,
        )),
    );

    return textureName.replace(".png", "");
  }

  addFlipbook(block: BlockEntry) {
    const frameCount = block.color.texture.height / block.color.texture.width;
    const frames: number[] = [];

    for (let i = 1; i <= frameCount; i++) {
      frames.push(i);
    }

    const flipbookData = {
      flipbook_texture: `textures/blocks/${block.resourceId}`,
      frames,
      atlas_tile: block.resourceId,
      ticks_per_frame: 1, //Math.floor(frameCount * 1.666),
      blend_frames: false,
    };

    this._flipbooksJson.push(flipbookData);
  }

  _writeFlipbooks() {
    return this.addToResourcePack(
      "textures/flipbook_textures.json",
      JSON.stringify(this._flipbooksJson),
    );
  }

  addToBehaviorPack(key: string, contents: string | Uint8Array) {
    return this.behaviorPack.addFile(Addon.sanitizeFilename(key), contents, {
      createFolders: true,
    });
  }

  addToResourcePack(key: string, contents: string | Uint8Array) {
    return this.resourcePack.addFile(Addon.sanitizeFilename(key), contents, {
      createFolders: true,
    });
  }

  createArchive(namespace: string, size: PackSizes) {
    for (const languageKey in this._languages) {
      this.resourcePack.addFile(
        `texts/${languageKey}.lang`,
        [...new Set(this._languages[<LanguageId> languageKey])].join(EOL.CRLF),
      );
    }

    this.resourcePack.addFile(
      "texts/languages.json",
      JSON.stringify(Object.keys(this._languages)),
    );

    this.resourcePack.addFile(
      "blocks.json",
      JSON.stringify({ format_version: [1, 1, 0], ...this._blocksJson }),
    );

    const mips = calculateMipLevels(size);

    this.resourcePack.addFile(
      "textures/terrain_texture.json",
      JSON.stringify({
        num_mip_levels: mips,
        padding: Math.max(1, 2 * mips),
        resource_pack_name: namespace,
        texture_name: "atlas.terrain",
        texture_data: this._textureData,
      }),
    );

    this._writeFlipbooks();

    // createContentsFile(bp);
    // createContentsFile(rp);

    return this._zip.generateAsync({
      mimeType: "application/zip",
      platform: "DOS",
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: {
        level: 1,
      },
    });
  }
}
