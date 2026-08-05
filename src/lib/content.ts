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

/** 写真付きで大きく見せる「推し」の品と、文字だけの一覧に回す品に分ける。 */
export type MenuSplit = { featured: MenuItem[]; rest: MenuItem[] };

// microCMS に isFeatured を作る前でも成立させるための上限。
// フィールドが無いと全品が候補になってしまうため、先頭から数品に絞る。
const FEATURED_FALLBACK_LIMIT = 5;

export function splitFeaturedMenu(items: MenuItem[]): MenuSplit {
  const split = (featured: MenuItem[]): MenuSplit => {
    const ids = new Set(featured.map((item) => item.id));
    return { featured, rest: items.filter((item) => !ids.has(item.id)) };
  };

  // 1. isFeatured が1件でも true なら、それを正とする（お店の明示指定を尊重）
  const explicit = items.filter((item) => item.isFeatured === true);
  if (explicit.length > 0) return split(explicit);

  // 2. フィールド未作成／全て false のときは、写真がある品を先頭から数品だけ拾う
  const withImage = items.filter((item) => item.image);
  if (withImage.length > 0) return split(withImage.slice(0, FEATURED_FALLBACK_LIMIT));

  // 3. 写真が1枚も無いうちは、先頭の数品を枠として出す。
  //    ここで空を返すと写真主体の組みが画面から消えてしまい、
  //    何を撮ればよいかも伝わらなくなるため、ダミー枠として見せ続ける。
  //    ただしドリンクは「代表の品」になり得ないので候補から外す。
  const food = items.filter((item) => item.category !== 'ドリンク');
  return split(food.slice(0, FEATURED_FALLBACK_LIMIT));
}
