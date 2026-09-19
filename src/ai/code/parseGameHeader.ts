// src/ai/code/parseGameHeader.ts
// コードゲーム .js のヘッダーコメントを解釈する純粋関数(fs非依存 = Node/ブラウザ両対応)。
// run-upload-games.ts(Supabaseアップロード)と LocalGamesPage.tsx(ローカル再生・審査)が
// 同じロジックを共有するための単一の真実の源。片方だけ直して食い違う事故を防ぐ。

export interface GameHeaderMeta {
  title: string;
  description: string;
  /** ヘッダーコメント // @tier: S|A|B|C(価格連動テーブルに存在する場合のみ) */
  tier?: string;
  /** ヘッダーコメント // @mechanic: <MECHANICS_CATALOG_V2のID> */
  mechanic?: string;
  /** ヘッダーコメント // @theme: <世界観テーマ> */
  theme?: string;
  /** ヘッダーコメント // @trend: <SNSトレンド元ネタID> */
  trendSource?: string;
}

/** tier → 1プレイ価格(円)。存在する tier のみ有効値として扱う */
export const TIER_PRICE_YEN: Record<string, number> = { S: 100, A: 50, B: 30, C: 10 };

/** 先頭コメント群から // @key: value ヘッダーを解釈 */
export function parseHeaderTags(lines: string[]): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const line of lines.slice(0, 20)) {
    if (!line.startsWith('//')) break;
    const m = /^\/\/\s*@(tier|mechanic|theme|trend)\s*:\s*(\S.*)$/.exec(line.trim());
    if (m) tags[m[1]] = m[2].trim();
  }
  return tags;
}

/**
 * ゲームコード先頭のコメント行からタイトル・説明・ヘッダータグを抽出する。
 *   Line 1: // NNN-kebab-name.js
 *   Line 2: // タイトル — 体験説明
 *   Line 3: // 操作: ...
 *   任意:   // @tier: S  // @mechanic: timing_one_shot  // @theme: space  // @trend: xxx
 */
export function parseGameHeader(code: string, baseName: string): GameHeaderMeta {
  const lines = code.split('\n');

  let title = baseName;
  let description = '';

  if (lines[1] && lines[1].startsWith('// ')) {
    const raw = lines[1].slice(3).trim();
    const dashIdx = raw.indexOf(' — ');
    if (dashIdx !== -1) {
      title = raw.slice(0, dashIdx).trim();
      description = raw.slice(dashIdx + 3).trim();
    } else {
      title = raw;
    }
  }

  if (!description && lines[2] && lines[2].startsWith('// ')) {
    description = lines[2].slice(3).trim();
  }

  if (!description) {
    description = `Swizzle mini game: ${title}`;
  }

  const tags = parseHeaderTags(lines);
  const tier = tags.tier ? tags.tier.toUpperCase() : undefined;

  return {
    title,
    description,
    tier: tier && TIER_PRICE_YEN[tier] !== undefined ? tier : undefined,
    mechanic: tags.mechanic,
    theme: tags.theme,
    trendSource: tags.trend,
  };
}
