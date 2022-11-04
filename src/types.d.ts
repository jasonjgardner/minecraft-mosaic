import type Material from "./components/Material.ts";

import { Frame, Image } from "imagescript/mod.ts";

export type ChannelValue = number;

export type RGB = [ChannelValue, ChannelValue, ChannelValue];

export type RGBA = [ChannelValue, ChannelValue, ChannelValue, ChannelValue];

export type PackSizes = 16 | 32 | 64 | 128 | 256;

export type LanguageId = "en_US" | "en_GB"; // TODO: Add more languages

export type PaletteInput = File | string | null;

export type Alignment = "e2e" | "b2b" | "even" | "odd" | "none";

export type Axis = "x" | "y" | "z";

export type UUID = string;

export type PackIDs = [UUID, UUID, UUID, UUID];

export type SemverVector = [number, number, number];

export interface TextureSet {
  heightmap?: string;
  normal?: string;
  color: string | Image | Frame | RGB | RGBA;
  metalness_emissive_roughness?: string | RGB;
}

export type MaterialInstanceFace =
  | "*"
  | "up"
  | "down"
  | "north"
  | "south"
  | "east"
  | "west";

export type MaterialInstance = {
  [face in MaterialInstanceFace]?: {
    texture: string;
    render_method: "opaque" | "double_sided" | "blend" | "alpha_test";
    face_dimming: boolean;
    ambient_occlusion: boolean;
  };
};

export interface IBlockTexture {
  name: string;
  title(lang: LanguageId): string;
  components: MinecraftData;
  textureSet: TextureSet | Omit<TextureSet, "color">;
  texture: Image | Frame;
  rgba: RGBA;
  hex: string;
  isTranslucent: boolean;
  isTransparent: boolean;
}

export interface BlockComponents {
  description: MinecraftData;
  components: MinecraftData;
  events: { [k: string]: MinecraftEvent };
  permutations: MinecraftData[];
}

export interface FlipbookComponent {
  flipbook_texture: string;
  atlas_tile: string;
  atlas_index?: number;
  ticks_per_frame: number;
  frames: number[];
  replicate?: number;
  blend_frames?: boolean;
}

export type MaterialMultiplier = (idx: number) => number;

export type MinecraftTerrainData = {
  [key: string]: {
    textures: string | string[];
  };
};

export type MinecraftRecordTypes =
  | boolean
  | string
  | number
  | Array<MinecraftRecordTypes>;

export type MinecraftData = {
  [key: string]: MinecraftData | MinecraftRecordTypes;
};

export type MinecraftEvent = {
  [key: string]:
    | {
      [key: string]:
        | MinecraftRecordTypes
        | MinecraftEvent
        | Array<
          | MinecraftRecordTypes
          | MinecraftEvent
          | {
            [key: string]: MinecraftRecordTypes | MinecraftEvent;
          }
        >;
    }
    | MinecraftRecordTypes
    | MinecraftEvent[];
};

export type MultiLingual = {
  [key in LanguageId]: string;
};

export type LanguagesContainer = Record<LanguageId, string[]>;

export interface IPermutation {
  name: string;
  enabled?: boolean;
  experimental?: boolean;
  properties: MinecraftData;
  events: MinecraftEvent;
  permutations: MinecraftData[];
}

export interface CreationParameters {
  size: PackSizes;
  namespace: string;
  pixelArtSourceName?: string;
  description?: string;
  blocks?: Array<IBlockTexture>;
  materialOptions?: Material[];
  outputFunctions?: boolean;
  outputPixelArt?: boolean;
  pixelArtSource?: string;
  animationAlignment?: Alignment;
  slices?: number;
}
