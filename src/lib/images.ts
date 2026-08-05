import type { ImageMetadata } from 'astro';
import rawImageMap from '../data/image-map.json';

const localImages = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/images/*.{jpg,jpeg,png}',
  { eager: true }
);

export function getLocalImage(localPath?: string): ImageMetadata | undefined {
  if (!localPath) return undefined;
  return localImages[localPath]?.default;
}

export type ImageMapEntry = {
  localPath: string;
  width?: number;
  height?: number;
  alt?: string;
};

export type ImageMap = {
  generatedAt: string | null;
  menu: Record<string, ImageMapEntry>;
  gallery: Record<string, ImageMapEntry>;
  // shop はオブジェクト形式のため、レコードIDではなくフィールド名で引く。
  // microCMS 側でフィールド未作成／未入力なら、そのキー自体が存在しない。
  shop?: Partial<Record<'heroImage' | 'ownerImage', ImageMapEntry>>;
};

// scripts/prebuild-images.mjs が生成する JSON（空オブジェクトのままだと index signature が
// 推論できないため、実体の型を明示してキャストする）
export const imageMap = rawImageMap as unknown as ImageMap;
