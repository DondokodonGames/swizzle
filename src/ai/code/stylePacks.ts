/**
 * stylePacks.ts — 時代別スタイルパックの単一の真実の源。
 *
 * 制作順序（PRODUCTION_ORDER.md）の第3段。**様式は最後に当てる分類**であって
 * 差別化手段ではない。ただし見た目の多様性はここが担保するので、
 * 実在した各時代のハード表現を広く網羅する。
 *
 * 命名規則: **ハードウェアの商標名は使わない**（IP_SAFETY_RULES）。
 * 「ファミコン」「スーファミ」「ゲームボーイ」等は権利者の商標なので、
 * 時代と技法で言い換える（8bit HOME / 8bit HANDHELD …）。ドット様式そのものは権利ではない。
 *
 * **描画プリミティブの制約**: サンドボックスは rect / circle / line / sprite / gradient / text だけで、
 * 任意多角形の塗りも回転も無い（iframeTemplate.ts）。3D系の様式は
 * 「横1pxの矩形ストリップで面を塗る」「奥行きは sprite の px スケールで表す」
 * といった2Dでの再現手段に落としてある。詳細は ARCADE_ART_DIRECTION.md §2。
 *
 * 詳細な描き方は docs/specifications/ARCADE_ART_DIRECTION.md §2。
 * ゲームは冒頭に `// スタイル: <label>` を宣言する（v3バリデーターが検査）。
 */

export interface StylePack {
  /** 機械可読ID */
  id: string;
  /** 見え方の次元。時代とは別軸で偏りを見るために持つ */
  dimension: '2d' | 'pseudo3d';
  /** ゲームが宣言するラベル（`// スタイル: 80s NEON`） */
  label: string;
  /** 由来（どの時代のどんな表示装置の表現か） */
  era: string;
  /** 色数の目安 */
  palette: string;
  /** 一言での特徴 */
  note: string;
}

export const STYLE_PACKS: StylePack[] = [
  // ── アーケード黎明〜80年代 ────────────────────────────────────────────
  { dimension: '2d', id: 'vector_70s',        label: '70s VECTOR',            era: '70s ベクタースキャン', palette: '発光1〜3色', note: '黒地に発光する線画のみ。塗りを使わない' },
  { dimension: '2d', id: 'mono_70s',          label: '70s MONO',              era: '70s ラスター白黒',     palette: '白 + 帯の単色',  note: '白ドット + カラーセロハンの帯' },
  { dimension: '2d', id: 'neon_80s',          label: '80s NEON',              era: '80s アーケード',       palette: '発光4色',        note: '濃紺グラデ + 疑似グロー、点滅が命' },
  { dimension: '2d', id: 'iso_80s',           label: '80s ISO',               era: '80s クォータービュー', palette: '6〜8色',         note: '菱形グリッド、影で高さを示す' },

  // ── 家庭用/携帯 8bit ─────────────────────────────────────────────────
  { dimension: '2d', id: 'home_8bit',         label: '8bit HOME',             era: '80s 家庭用8bit',       palette: '3〜4色 + 黒',    note: '8x8ドット、タイル反復背景、1方向スクロール' },
  { dimension: '2d', id: 'handheld_8bit',     label: '8bit HANDHELD',         era: '80s〜90s 携帯モノクロ', palette: '4階調（黄緑寄り）', note: '残像・低コントラスト・画面枠' },
  { dimension: '2d', id: 'pc_monitor_8bit',   label: '8bit PC MONITOR',       era: '80s ホビーPC',         palette: '8色ベタ',        note: '高解像度・低色数、細線とテキスト枠のUI' },

  // ── 16bit ────────────────────────────────────────────────────────────
  { dimension: '2d', id: 'console_16bit',     label: '90s 16bit',             era: '90s 家庭用16bit',      palette: '多色・高彩度',   note: '2〜3層の背景で奥行き、表情のあるスプライト' },
  { dimension: '2d', id: 'big_sprite_16bit',  label: '90s BIG SPRITE',        era: '90s 対戦/ベルト筐体',  palette: '多色',           note: '巨大キャラ、床影、間合いで見せる' },
  { dimension: '2d', id: 'handheld_color_16bit', label: '90s HANDHELD COLOR', era: '90s 携帯カラー',       palette: '低彩度・少色',   note: '小画面前提の太い形、密度を抑える' },

  // ── 疑似3D / プリレンダ ───────────────────────────────────────────────
  { dimension: 'pseudo3d', id: 'pre_render_90s', label: '90s PRE-RENDER',    era: '90s プリレンダCG',     palette: '暗め・金属質',   note: '粒状ノイズと擬似奥行き。背景は1枚絵として描く' },
  { dimension: 'pseudo3d', id: 'low_poly_90s',  label: '90s LOW POLY',      era: '初期3D家庭用機',       palette: '面ベタ塗り',     note: '輪郭は line、面は横1pxストリップ塗り。頂点ジッターとフォグ' },

  // ── 2000s〜現代 ───────────────────────────────────────────────────────
  { dimension: '2d', id: 'arcade_pop_2000s',  label: '2000s ARCADE POP',      era: '2000s 音ゲー/メダル',  palette: '原色 + 白縁',    note: '明るい背景、光の柱と祝祭演出' },
  { dimension: '2d', id: 'handheld_pastel_2000s', label: '2000s HANDHELD PASTEL', era: '2000s 携帯機',     palette: 'パステル',       note: '白縁の丸い形、上下に情報を分ける名残' },
  { dimension: '2d', id: 'flat_mobile_2010s', label: '2010s FLAT MOBILE',     era: '2010s スマホUI',       palette: 'ベタ塗り数色',   note: '影なし・丸角・余白、アイコン的な形' },
  { dimension: '2d', id: 'neo_retro',         label: 'NEO-RETRO',             era: '現代インディ',         palette: '限定4〜6色',     note: '大きいドット、1色だけ強い差し色' },
  { dimension: '2d', id: 'modern_ad',         label: 'MODERN AD-GAME',        era: '現代の動画広告ゲーム', palette: '高彩度・高コントラスト', note: '太い縁取り、飛ぶ数字、3秒で伝わる画面' },
  { dimension: '2d', id: 'pixel_hd',          label: 'PIXEL HD',              era: '現代の高精細ドット',   palette: '多色 + 光',      note: 'パララックス、ライティング、細かいアニメ' },
  { dimension: '2d', id: 'ink_1bit',          label: '1BIT INK',              era: '2値表示 / 墨',         palette: '白黒2値',        note: 'ディザで階調を作る。線の太さで語る' },

  // ── 疑似3Dの系譜（2Dプリミティブで3Dの見え方を再現する）────────────────
  { dimension: 'pseudo3d', id: 'mode7_pseudo',       label: 'MODE7 PSEUDO',       era: '16bit 床の回転拡大',   palette: '少色 + 地平グラデ',  note: '横1pxストリップを奥ほど圧縮。地平線へ収束する床' },
  { dimension: 'pseudo3d', id: 'billboard_3d_2000s', label: '2000s BILLBOARD 3D', era: '2000s 家庭用3D',       palette: '多色 + 影',          note: '奥行きは sprite の px スケールで表す。接地影で位置を示す' },
  { dimension: 'pseudo3d', id: 'hd_post_3d',         label: 'HD POST 3D',         era: 'HD期の3D',             palette: '低彩度・褐色寄り',   note: 'ブルーム(半透明円の重ね)とビネット。コントラストを潰す' },
  { dimension: 'pseudo3d', id: 'toon_shade',         label: 'TOON SHADE',         era: 'セルシェード3D',       palette: '2段階陰影 + 黒線',   note: '太い輪郭を先に描き、内側を明暗2色だけで塗る' },
  { dimension: 'pseudo3d', id: 'voxel_block',        label: 'VOXEL BLOCK',        era: '立方体ブロック',       palette: '面ごとに3明度',      note: '立方体を上面/左面/右面の3明度で。等角に積む' },

  // ── スマホの系譜 ─────────────────────────────────────────────────────
  { dimension: '2d',       id: 'skeuomorph',         label: 'SKEUOMORPH',         era: '初期スマホUI',         palette: '質感テクスチャ',     note: '木目・フェルト・光沢ボタン。gradient で厚みを作る' },
  { dimension: 'pseudo3d', id: 'hypercasual_3d',     label: 'HYPERCASUAL 3D',     era: '現代ハイパーカジュアル', palette: '白背景 + 単色',      note: '柔らかい影の丸い塊。当たり判定が見た目どおり' },
];

/** 次元（2D / 疑似3D）で絞る */
export function stylePacksByDimension(dimension: StylePack['dimension']): StylePack[] {
  return STYLE_PACKS.filter((p) => p.dimension === dimension);
}

/** ラベル → パック */
export const STYLE_PACK_BY_LABEL: ReadonlyMap<string, StylePack> = new Map(
  STYLE_PACKS.map((p) => [p.label, p])
);

/** ゲーム冒頭の `// スタイル: <label>` を取り出す（無ければ null） */
export function extractStyleLabel(code: string): string | null {
  const m = code.match(/\/\/\s*スタイル\s*[:：]\s*(.+)/);
  return m ? m[1].trim() : null;
}

/** 既知のスタイルパックか */
export function isKnownStylePack(label: string): boolean {
  return STYLE_PACK_BY_LABEL.has(label);
}
