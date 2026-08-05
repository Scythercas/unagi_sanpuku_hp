import {
  GALLERY_TYPES,
  MENU_CATEGORIES,
  type GalleryItem,
  type MenuCategory,
  type MenuItem,
} from './microcms';

export type MenuGroup = { category: MenuCategory; items: MenuItem[] };
export type GalleryGroup = { type: (typeof GALLERY_TYPES)[number]; items: GalleryItem[] };

export function groupMenuByCategory(items: MenuItem[]): MenuGroup[] {
  return MENU_CATEGORIES.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);
}

export function groupGalleryByType(items: GalleryItem[]): GalleryGroup[] {
  return GALLERY_TYPES.map((type) => ({
    type,
    items: items.filter((item) => item.type === type),
  })).filter((group) => group.items.length > 0);
}
