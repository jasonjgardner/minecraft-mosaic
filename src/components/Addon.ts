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
  _languages: LanguagesContainer = {
    en_US: [],
    en_GB: [],
  };

  constructor() {
    this._zip = new JSZip();
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
        await textureSet.color.resize(size, size).encode(COMPRESSION_LEVEL),
      );
      textureSet.color = block.resourceId;
    } else {
      await this.requireMaterialAsset(`${textureSet.color}`, size);
    }

    if (!isColor(textureSet.metalness_emissive_roughness || "")) {
      await this.requireMaterialAsset(
        `${textureSet.metalness_emissive_roughness}`,
        size,
      );
    }

    if (textureSet.normal) {
      await this.requireMaterialAsset(textureSet.normal, size);
    } else if (textureSet.heightmap) {
      await this.requireMaterialAsset(textureSet.heightmap, size);
    }

    return this.resourcePack.folder("textures/blocks").addFile(
      Addon.sanitizeFilename(`${block.resourceId}.texture_set.json`),
      JSON.stringify({
        format_version: TEXTURE_SET_FORMAT_VERSION,
        "minecraft:texture_set": textureSet,
      }),
    );
  }

  addBlock(block: BlockEntry, size: PackSizes) {
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

    return this.addTextureSet(block, size);
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
