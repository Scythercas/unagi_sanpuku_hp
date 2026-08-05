import { createClient, type MicroCMSImage, type MicroCMSListContent } from 'microcms-js-sdk';

const serviceDomain = import.meta.env.MICROCMS_SERVICE_DOMAIN;
const apiKey = import.meta.env.MICROCMS_API_KEY;

if (!serviceDomain || !apiKey) {
  throw new Error(
    'MICROCMS_SERVICE_DOMAIN / MICROCMS_API_KEY が設定されていません。.env を確認してください。'
  );
}

export const client = createClient({ serviceDomain, apiKey });

// --- API① shop（オブジェクト形式） ---
// 末尾4つは写真主体デザイン向けの追加フィールド。microCMS 側で未作成でも
// undefined になるだけで壊れないよう、すべて任意にしてある。
export type Shop = {
  name: string;
  catchcopy?: string;
  hours: string;
  closedDays: string;
  address: string;
  tel: string;
  parking?: string;
  seatsCounter?: number;
  seatsTable?: number;
  takeout?: boolean;
  delivery?: boolean;
  instagramUrl?: string;
  accessNote?: string;
  notes?: string;
  heroImage?: MicroCMSImage;
  ownerMessage?: string;
  ownerImage?: MicroCMSImage;
  ownerName?: string;
};

// --- API② menu（リスト形式） ---
export const MENU_CATEGORIES = [
  'うな丼',
  'うな重',
  '定食',
  '一品',
  '宴会・コース',
  'テイクアウト',
  'ドリンク',
] as const;
export type MenuCategory = (typeof MENU_CATEGORIES)[number];

export type MenuItem = MicroCMSListContent & {
  category: MenuCategory;
  name: string;
  price: number;
  description?: string;
  image?: MicroCMSImage;
  order: number;
  // 写真付きで大きく見せる「推し」の品。microCMS 側で未作成なら undefined
  isFeatured?: boolean;
};

// --- API③ gallery（リスト形式） ---
export const GALLERY_TYPES = ['外観', '内装', '調理', '料理', 'その他'] as const;
export type GalleryType = (typeof GALLERY_TYPES)[number];

export type GalleryItem = MicroCMSListContent & {
  image: MicroCMSImage;
  type: GalleryType;
  caption?: string;
  order: number;
};

// --- API④ recruit（オブジェクト形式） ---
export type Recruit = {
  isOpen: boolean;
  jobDescription?: string;
  wage?: string;
  shift?: string;
  howToApply?: string;
};

// --- API⑤ news（リスト形式） ---
export type NewsItem = MicroCMSListContent & {
  title: string;
  body: string;
  publishedAt: string;
  important?: boolean;
};

export async function getShop(): Promise<Shop> {
  return client.getObject<Shop>({ endpoint: 'shop' });
}

// microCMS のセレクトフィールドは「複数選択」設定だと値が配列で返る。
// このサイトのカテゴリ/種別は常に単一選択の想定なので、配列なら先頭要素を使う。
function firstOf<T>(value: T | T[]): T {
  return Array.isArray(value) ? value[0] : value;
}

export async function getMenuList(): Promise<MenuItem[]> {
  const { contents } = await client.getList<Omit<MenuItem, 'category'> & {
    category: MenuCategory | MenuCategory[];
  }>({
    endpoint: 'menu',
    queries: { limit: 100, orders: 'order' },
  });
  return contents.map((item) => ({ ...item, category: firstOf(item.category) }));
}

export async function getGalleryList(): Promise<GalleryItem[]> {
  const { contents } = await client.getList<Omit<GalleryItem, 'type'> & {
    type: GalleryType | GalleryType[];
  }>({
    endpoint: 'gallery',
    queries: { limit: 100, orders: 'order' },
  });
  return contents.map((item) => ({ ...item, type: firstOf(item.type) }));
}

export async function getRecruit(): Promise<Recruit> {
  return client.getObject<Recruit>({ endpoint: 'recruit' });
}

export async function getNewsList(): Promise<NewsItem[]> {
  const { contents } = await client.getList<NewsItem>({
    endpoint: 'news',
    queries: { limit: 100, orders: '-publishedAt' },
  });
  return contents;
}
