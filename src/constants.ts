import type { ReleaseType } from "semver/mod.ts";
import { PackSizes } from "./types.d.ts";

export const RUNNING_LOCALLY = !Deno.env.get("DENO_DEPLOYMENT_ID") &&
  !Deno.env.get("GITHUB_ACTIONS");

export const MIN_PACK_SIZE: PackSizes = 16;
export const MAX_PACK_SIZE: PackSizes = 256;

export const DEFAULT_PACK_SIZE: PackSizes = MIN_PACK_SIZE;

export const DEFAULT_SLICE_SIZE = 16;

export const DEFAULT_LICENSE = "GPL-3.0-or-later";

export const DEFAULT_BUILD_VERSION = "1.0.0";
export const DEFAULT_DESCRIPTION = "Block palette generated from image input";
export const DEFAULT_NAMESPACE = "art"; // TODO: Create namespace hash function
export const BEHAVIOR_BLOCK_FORMAT_VERSION = "1.19.20";

export const TEXTURE_SET_FORMAT_VERSION = "1.16.100";

export const BLOCK_ENGINE_VERSION = 17959425;

export const DEFAULT_RELEASE_TYPE: ReleaseType = "prerelease";

export const DEFAULT_HEIGHTMAP_NAME = "default_heightmap";

export const DEFAULT_PACK_ICON_URL =
  "https://raw.githubusercontent.com/MicrosoftDocs/minecraft-creator/20bab91daddc604f9a310d02ed1c6e9ead126f55/creator/Reference/Source/VanillaResourcePack/pack_icon.png";

/**
 * Emissive level at which ambient occlusion is disabled on a block's face
 */
export const AO_EMISSIVE_THRESHOLD = 50;

/**
 * Default sound ID applied in blocks.json
 */
export const DEFAULT_BLOCK_SOUND = "dirt";

export const MAX_FRAMES = RUNNING_LOCALLY ? 16 : 10;
export const FUNCTIONS_NAMESPACE = "print";

export const MIN_PALETTE_LENGTH = 1;

/**
 * Minecraft chunk size
 */
export const CHUNK_SIZE = 16;

/**
 * Maximum output size of fill functions
 */
export const MAX_PRINT_SIZE = 24 * CHUNK_SIZE;

// Print 1:1 scale
export const DEFAULT_PRINT_CHUNKS = 1;

/**
 * Maximum output size of fill functions in chunks
 */
export const MAX_PRINT_CHUNKS = CHUNK_SIZE;

/**
 * Maximum length of a .mcfunction file
 */
export const MAX_FUNCTION_LINES = 10000;

export const DEFAULT_PRINT_BLOCK = "minecraft:stone";

export const TRANSPARENT_PRINT_BLOCK = "minecraft:air";

export const TRANSPARENT_PRINT_BLOCK_THRESHOLD = 0.5;

/**
 * Minimum pixel alpha value to allow in palette
 */
export const MIN_ALPHA = Math.round(255 * TRANSPARENT_PRINT_BLOCK_THRESHOLD);

export const TARGET_VERSION: [number, number, number] = [1, 19, 2];

export const BASE_GAME_VERSION: [number, number, number] = TARGET_VERSION;

/**
 * Pack icon font file
 */
export const FONT_FILE = "Inter-Bold.ttf";

export const FONT_URL =
  "https://raw.githubusercontent.com/weiweihuanghuang/Work-Sans/blob/b35c81086186162164947bd39574683073d9b268/fonts/otf/WorkSans-Bold.otf";

/**
 * Pack icon pixel dimensions
 */
export const PACK_ICON_SIZE = 250;
export const PACK_ICON_FONT_SIZE = 24;

export const ART_SOURCE_ID = "input";

export const LABEL_BLOCK_EVENT = "e";

export const LABEL_BLOCK_PROPERTY = "";

/**
 * Imagescript PNG compression level (0-3)
 */
export const COMPRESSION_LEVEL = 0;

export const SUPPORTED_EXTENSIONS = ["jpg", "jpeg", "gif", "png"];

export const DEFAULT_MATERIAL_ID = "plastic";
