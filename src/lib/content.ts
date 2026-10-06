import {
  GALLERY_TYPES,
  MENU_CATEGORIES,
  type GalleryItem,
  type GalleryType,
  type MenuCategory,
  type MenuItem,
} from './microcms';

// お品書きは店頭の品書きと同じ「御食事・一品料理・御飲物」の3つに分けて見せる。
// microCMS のカテゴリ（細分類）はそのまま残し、表示の分類にまとめるだけにする。
// 並びは「細分類の順 → order」なので、CMS では細分類の中の順番だけを管理すればよい。
const MENU_SECTIONS: readonly { label: string; categories: readonly MenuCategory[] }[] = [
  { label: '御食事', categories: ['うな丼', 'うな重', '定食', '宴会・コース', 'テイクアウト'] },
  { label: '一品料理', categories: ['一品'] },
  { label: '御飲物', categories: ['ドリンク'] },
];

export type MenuGroup = { label: string; items: MenuItem[] };
export type GalleryGroup = { type: (typeof GALLERY_TYPES)[number]; items: GalleryItem[] };

export function groupMenuByCategory(items: MenuItem[]): MenuGroup[] {
  return MENU_SECTIONS.map(({ label, categories }) => ({
    label,
    items: items
      .filter((item) => categories.includes(item.category))
      .sort(
        (a, b) =>
          categories.indexOf(a.category) - categories.indexOf(b.category) || a.order - b.order
      ),
  })).filter((group) => group.items.length > 0);
}

// MENU_CATEGORIES のうち、どの表示分類にも属さないものが出ないよう型の外で確かめる
const unsectioned = MENU_CATEGORIES.filter(
  (category) => !MENU_SECTIONS.some((section) => section.categories.includes(category))
);
if (unsectioned.length > 0) {
  throw new Error(`お品書きの表示分類に含まれないカテゴリがあります: ${unsectioned.join(', ')}`);
}

// 写真帖のタブ名は、写真を預かった Google Drive のフォルダ名（外観・内観…）に合わせる。
// microCMS のセレクト値は変えずに、表示だけ読み替える。
const GALLERY_TAB_LABELS: Partial<Record<GalleryType, string>> = { 内装: '内観' };

export function galleryTabLabel(type: GalleryType): string {
  return GALLERY_TAB_LABELS[type] ?? type;
}

export function groupGalleryByType(items: GalleryItem[]): GalleryGroup[] {
  return GALLERY_TYPES.map((type) => ({
    type,
    items: items.filter((item) => item.type === type),
  })).filter((group) => group.items.length > 0);
}
