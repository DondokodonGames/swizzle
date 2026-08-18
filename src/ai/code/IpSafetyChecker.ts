/**
 * 権利安全性チェッカー（IP safety）
 *
 * 方針（`docs/specifications/IP_SAFETY_RULES.md` が canon）:
 *   **ジャンルとメカニクスは自由。固有名詞・キャラクター・特徴的なビジュアルは完全オリジナル。**
 *
 * 800本規模の自動量産では「1本ずつなら気づくこと」が見逃される。寄りすぎを人間の注意力に
 * 任せず、生成物のテキスト面（ヘッダーコメント・世界観・画面に出る文字列・ファイル名）を
 * 機械的に走査して落とす。
 *
 * 検出できないもの（人間の確認が要る）:
 *   - 名前を出さずにビジュアルだけ寄せたケース（キャラのシルエット・独特のUI配置）
 *   - 特定タイトルの画面構成そのものの再現
 * このチェッカーは「明らかな寄せ」を止める最初の関門であって、免罪符ではない。
 */

export type IpSeverity = 'error' | 'warning';

export interface IpDenyEntry {
  /** 表示用の語 */
  term: string;
  /** 権利者（表示用） */
  owner: string;
  /** 検出パターン */
  pattern: RegExp;
  severity: IpSeverity;
  /** 誤検出を打ち消す語（例: マリオ に対する マリオネット） */
  except?: RegExp[];
  /** 何が問題で、代わりに何をすべきか */
  note: string;
}

export interface IpViolation {
  term: string;
  owner: string;
  severity: IpSeverity;
  line: number;
  excerpt: string;
  note: string;
}

export interface IpSafetyResult {
  ok: boolean;
  violations: IpViolation[];
  /** 許諾済みIP（CAPCOM / SNK）の語が使われている場合の記録。違反ではない */
  licensedHits: Array<{ term: string; owner: string; line: number }>;
}

/**
 * 表現の指紋（共起ルール）。
 *
 * 固有名詞を消しただけの「名前なしクローン」を捕まえるためのもの。
 * 「赤白のボールを投げて捕まえる」「土管と赤い帽子」のように、**複数の具体的な意匠が
 * 同時に揃った**ときだけ反応する。
 *
 * 設計上の線引き（IP_SAFETY_RULES.md §1 と同じ）:
 *   メカニクスは自由。だから「ブロックを回転して行を消す」「同種を合体させて育てる」
 *   「固定砲台で隊列を撃つ」はここに入れない — 入れると作れるはずのものが作れなくなる。
 *   入れるのは**そのタイトル固有の見た目・配役**の組み合わせだけ。
 */
export interface IpCompositeRule {
  term: string;
  owner: string;
  /** すべて満たしたときだけ違反にする */
  all: RegExp[];
  note: string;
}

export const IP_COMPOSITE_RULES: IpCompositeRule[] = [
  {
    term: '赤白ボールで捕獲（意匠の複製）',
    owner: '任天堂/クリーチャーズ/GF',
    all: [/赤白|紅白|上半分.{0,6}赤|red.{0,10}white/i, /ボール|球体|\bball\b/i, /捕ま|捕獲|ゲット|capture/i],
    note: '「投げて捕獲する」メカニクスは自由。赤白の球という意匠を外し、独自の捕獲装置にする',
  },
  {
    term: '土管＋赤帽子キャラ（意匠の複製）',
    owner: '任天堂',
    all: [/土管|緑.{0,4}パイプ|green\s*pipe/i, /赤.{0,4}(帽子|キャップ)|赤い?帽|red\s*cap/i],
    note: 'ジャンプ・踏みつけのメカニクスは自由。土管と赤帽子の組み合わせをやめ、独自の世界観にする',
  },
  {
    term: '迷路＋ゴースト＋エサ（配役の複製）',
    owner: 'バンダイナムコ',
    all: [/迷路|maze/i, /ゴースト|幽霊|\bghost/i, /エサ|餌|ペレット|pellet|ドット/i],
    note: '追跡回避のメカニクスは自由。迷路×ゴースト×エサという配役をやめ、独自の追跡者と収集物にする',
  },
  {
    term: 'パチンコ＋鳥＋ブタ（配役の複製）',
    owner: 'Rovio',
    all: [/パチンコ|スリングショット|slingshot|カタパルト/i, /鳥|バード|\bbird/i, /ブタ|豚|\bpig/i],
    note: '弾道を狙って撃つメカニクスは自由。鳥とブタという配役をやめる',
  },
  {
    term: 'テトロミノ7種の名指し（意匠の複製）',
    owner: 'The Tetris Company',
    all: [/テトロミノ|tetromino/i, /[IJLOSTZ][\s,、・]?[IJLOSTZ]/],
    note: '落ち物パズルのメカニクスは自由。7種ミノの名称・形状セットをそのまま使わない',
  },
];

/** 許諾済み（NDA/契約下で寄せてよい）権利者 */
export const LICENSED_OWNERS = ['CAPCOM', 'SNK'] as const;

const D = (
  term: string,
  owner: string,
  pattern: RegExp,
  severity: IpSeverity,
  note: string,
  except?: RegExp[]
): IpDenyEntry => ({ term, owner, pattern, severity, note, except });

const ORIGINAL = '固有名詞を完全オリジナルに置き換える（メカニクスとジャンルはそのまま使ってよい）';
const HARDWARE = '内部呼称としては可。公開されるタイトル・説明・画面文字列には出さない';

/**
 * 禁止語彙。
 * ラテン文字は大文字小文字を無視、日本語は表記そのままで照合する。
 * 一般語と衝突する短い語（リンク / ピーチ / スイッチ / イカ 等）は、誤検出が実害になるため
 * **意図的に入れていない**。ここは「明白な固有名詞」だけを扱う。
 */
export const IP_DENY_LIST: IpDenyEntry[] = [
  // ---- 任天堂（特に危険: メイドインワリオ風 / マリオパーティ風 / リズム天国風）----
  D('マリオ', '任天堂', /マリオ/, 'error', ORIGINAL, [/マリオネット/]),
  D('Mario', '任天堂', /\bmario\b/i, 'error', ORIGINAL, [/marionette/i]),
  D('マリオパーティ', '任天堂', /マリオ\s*パーティ/, 'error', 'ボードパーティというジャンルは借りてよい。名前・キャラ・UIは寄せない'),
  D('ワリオ', '任天堂', /ワリオ/, 'error', 'マイクロゲーム集というジャンルは借りてよい。「メイドインワリオ風」で公開しない'),
  D('WarioWare', '任天堂', /wario\s*ware|made\s*in\s*wario/i, 'error', 'マイクロゲーム集というジャンルは借りてよい。名称は使わない'),
  D('リズム天国', '任天堂', /リズム\s*天国|rhythm\s*(heaven|tengoku)/i, 'error', 'リズムゲームというジャンルは借りてよい。名称・独特のUIは寄せない'),
  D('ゼルダ', '任天堂', /ゼルダ|\bzelda\b/i, 'error', ORIGINAL),
  D('ハイラル', '任天堂', /ハイラル|\bhyrule\b/i, 'error', ORIGINAL),
  D('トライフォース', '任天堂', /トライフォース|\btriforce\b/i, 'error', ORIGINAL),
  D('ポケモン', '任天堂/クリーチャーズ/GF', /ポケモン|\bpok[eé]mon\b/i, 'error', ORIGINAL),
  D('ピカチュウ', '任天堂/クリーチャーズ/GF', /ピカチュウ|\bpikachu\b/i, 'error', ORIGINAL),
  D('モンスターボール', '任天堂/クリーチャーズ/GF', /モンスターボール/, 'error', ORIGINAL),
  D('カービィ', '任天堂/HAL', /カービィ|\bkirby\b/i, 'error', ORIGINAL),
  D('ドンキーコング', '任天堂', /ドンキー\s*コング|donkey\s*kong/i, 'error', ORIGINAL),
  D('ルイージ', '任天堂', /ルイージ|\bluigi\b/i, 'error', ORIGINAL),
  D('ヨッシー', '任天堂', /ヨッシー|\byoshi\b/i, 'error', ORIGINAL),
  D('クッパ', '任天堂', /クッパ/, 'error', ORIGINAL),
  D('メトロイド', '任天堂', /メトロイド|\bmetroid\b/i, 'error', ORIGINAL),
  D('スプラトゥーン', '任天堂', /スプラトゥーン|\bsplatoon\b/i, 'error', ORIGINAL),
  D('どうぶつの森', '任天堂', /どうぶつの森|あつ森|animal\s*crossing/i, 'error', ORIGINAL),
  // 「大乱闘」単体は一般語（乱闘もの）として使えるため、シリーズ名の形でのみ検出する
  D('スマブラ', '任天堂', /スマブラ|大乱闘スマッシュ|smash\s*bros/i, 'error', ORIGINAL),
  D('ファイアーエムブレム', '任天堂', /ファイア[ーア]?\s*エムブレム|fire\s*emblem/i, 'error', ORIGINAL),
  D('ピクミン', '任天堂', /ピクミン|\bpikmin\b/i, 'error', ORIGINAL),
  D('任天堂', '任天堂', /任天堂|\bnintendo\b/i, 'error', '権利者名そのもの。「〇〇風」の指示にも使わない'),
  D('ファミコン', '任天堂', /ファミコン|ファミリーコンピュータ|\bfamicom\b/i, 'warning', HARDWARE),
  D('スーパーファミコン', '任天堂', /スーパーファミコン|スーファミ|\bsnes\b|super\s*famicom/i, 'warning', HARDWARE),
  D('ゲームボーイ', '任天堂', /ゲームボーイ|game\s*boy|\bgameboy\b/i, 'warning', HARDWARE),

  // ---- セガ ----
  D('セガ', 'セガ', /\bsega\b/i, 'error', ORIGINAL),
  D('獣王記', 'セガ', /獣王記|altered\s*beast/i, 'error', ORIGINAL),
  D('ソニック（ザ・ヘッジホッグ）', 'セガ', /ソニック\s*[・･]?\s*ザ|sonic\s*the\s*hedgehog/i, 'error', ORIGINAL),
  D('ぷよぷよ', 'セガ', /ぷよぷよ|\bpuyo\b/i, 'error', '落ち物連鎖というメカニクスは借りてよい。名称・キャラは寄せない'),
  D('バーチャファイター', 'セガ', /バーチャファイター|virtua\s*fighter/i, 'error', ORIGINAL),
  D('龍が如く', 'セガ', /龍が如く|\byakuza\s*(game|series)\b/i, 'error', ORIGINAL),

  // ---- コナミ ----
  D('コナミ', 'コナミ', /コナミ|\bkonami\b/i, 'error', ORIGINAL),
  D('悪魔城ドラキュラ', 'コナミ', /悪魔城|castlevania/i, 'error', ORIGINAL),
  D('グラディウス', 'コナミ', /グラディウス|\bgradius\b/i, 'error', ORIGINAL),
  D('ツインビー', 'コナミ', /ツインビー|\btwinbee\b/i, 'error', ORIGINAL),
  D('メタルギア', 'コナミ', /メタルギア|metal\s*gear/i, 'error', ORIGINAL),
  D('桃太郎電鉄', 'コナミ', /桃太郎電鉄|桃鉄/, 'error', ORIGINAL),
  D('ビートマニア', 'コナミ', /ビートマニア|beatmania/i, 'error', ORIGINAL),
  D('ダンスダンスレボリューション', 'コナミ', /ダンスダンスレボリューション|dance\s*dance\s*revolution/i, 'error', ORIGINAL),

  // ---- バンダイナムコ ----
  D('ナムコ', 'バンダイナムコ', /ナムコ|\bnamco\b/i, 'error', ORIGINAL),
  D('パックマン', 'バンダイナムコ', /パックマン|pac[\s-]?man/i, 'error', '追いかけ/回避のメカニクスは借りてよい。名称・キャラは寄せない'),
  D('ギャラガ', 'バンダイナムコ', /ギャラガ|\bgalaga\b|ギャラクシアン|\bgalaxian\b/i, 'error', ORIGINAL),
  D('ゼビウス', 'バンダイナムコ', /ゼビウス|\bxevious\b/i, 'error', ORIGINAL),
  D('たまごっち', 'バンダイナムコ', /たまごっち|\btamagotchi\b/i, 'error', ORIGINAL),
  D('太鼓の達人', 'バンダイナムコ', /太鼓の達人|taiko\s*no\s*tatsujin/i, 'error', '和太鼓リズムというジャンルは借りてよい。名称・UIは寄せない'),
  D('ガンダム', 'バンダイナムコ/創通', /ガンダム|\bgundam\b/i, 'error', ORIGINAL),
  D('ドラゴンボール', '集英社/東映/バンダイナムコ', /ドラゴンボール|dragon\s*ball/i, 'error', ORIGINAL),
  D('鉄拳', 'バンダイナムコ', /鉄拳|\btekken\b/i, 'error', ORIGINAL, [/鉄拳制裁/]),
  D('アイドルマスター', 'バンダイナムコ', /アイドルマスター|\bidolm@?aster\b/i, 'error', ORIGINAL),

  // ---- タイトー ----
  D('タイトー', 'タイトー', /タイトー|\btaito\b/i, 'error', ORIGINAL),
  D('スペースインベーダー', 'タイトー', /スペースインベーダー|space\s*invaders?/i, 'error', '固定砲台シューティングというジャンルは借りてよい。名称・自機/敵の意匠は寄せない'),
  D('バブルボブル', 'タイトー', /バブルボブル|bubble\s*bobble/i, 'error', ORIGINAL),
  D('ダライアス', 'タイトー', /ダライアス|\bdarius\b/i, 'error', ORIGINAL),
  D('電車でGO', 'タイトー', /電車でGO|densha\s*de\s*go/i, 'error', '電車運転という題材は借りてよい。名称は使わない'),

  // ---- スクウェア・エニックス ----
  D('ドラゴンクエスト', 'スクウェア・エニックス', /ドラゴンクエスト|ドラクエ|dragon\s*quest/i, 'error', ORIGINAL),
  D('ファイナルファンタジー', 'スクウェア・エニックス', /ファイナルファンタジー|final\s*fantasy/i, 'error', ORIGINAL),
  D('クロノトリガー', 'スクウェア・エニックス', /クロノトリガー|chrono\s*trigger/i, 'error', ORIGINAL),
  D('キングダムハーツ', 'スクウェア・エニックス/ディズニー', /キングダムハーツ|kingdom\s*hearts/i, 'error', ORIGINAL),

  // ---- Simple2000 系（題材は借りてよいがブランド名はNG）----
  D('SIMPLE2000', 'D3パブリッシャー', /simple\s*2000|シンプル\s*2000/i, 'error', '題材（地球防衛・ゾンビ・電車など）は借りてよい。ブランド名は使わない'),
  D('D3パブリッシャー', 'D3パブリッシャー', /D3\s*パブリッシャー|d3\s*publisher/i, 'error', ORIGINAL),
  D('地球防衛軍', 'D3パブリッシャー/サンドロット', /地球防衛軍|earth\s*defense\s*force/i, 'warning', '「巨大生物から街を守る」題材は借りてよい。シリーズ名そのものは避け、独自の部隊名にする'),

  // ---- その他（動画広告/ハイパーカジュアル/流行アプリ系で寄りやすいもの）----
  D('テトリス', 'The Tetris Company', /テトリス|\btetris\b/i, 'error', '落ち物パズルというメカニクスは借りてよい。名称・7種ミノの意匠は寄せない'),
  D('マインクラフト', 'Mojang', /マインクラフト|マイクラ|\bminecraft\b/i, 'error', ORIGINAL),
  D('Among Us', 'InnerSloth', /among\s*us|アモングアス/i, 'error', ORIGINAL),
  D('Fall Guys', 'Mediatonic', /fall\s*guys|フォールガイズ/i, 'error', ORIGINAL),
  D('Flappy Bird', 'dotGEARS', /flappy\s*bird|フラッピーバード/i, 'error', '横スクロール回避というメカニクスは借りてよい。名称は使わない'),
  D('Angry Birds', 'Rovio', /angry\s*birds?|アングリーバード/i, 'error', ORIGINAL),
  D('Candy Crush', 'King', /candy\s*crush|キャンディークラッシュ/i, 'error', ORIGINAL),
  D('スイカゲーム', 'Aladdin X', /スイカゲーム|suika\s*game/i, 'error', '同種合体というメカニクスは借りてよい。名称は使わない'),
  D('パズドラ', 'ガンホー', /パズドラ|パズル\s*&\s*ドラゴンズ|puzzle\s*(and|&)\s*dragons/i, 'error', ORIGINAL),
  // 「モンスト」はカタカナ語の途中に現れないよう後続カタカナを除外（\b はカタカナ境界で効かない）
  D('モンスターストライク', 'MIXI', /モンスターストライク|モンスト(?![ァ-ヴー])/i, 'error', ORIGINAL),
  D('ウマ娘', 'Cygames', /ウマ娘/, 'error', ORIGINAL),
  D('原神', 'HoYoverse', /原神|\bgenshin\b/i, 'error', ORIGINAL),
  D('Undertale', 'Toby Fox', /undertale|アンダーテール/i, 'error', ORIGINAL),
];

/** 許諾済みIP（CAPCOM / SNK）。違反ではないが、使用時は②ジェネリックアーケード枠であることを明示する */
export const LICENSED_TERMS: Array<{ term: string; owner: string; pattern: RegExp }> = [
  { term: 'ストリートファイター', owner: 'CAPCOM', pattern: /ストリートファイター|street\s*fighter/i },
  { term: '魔界村', owner: 'CAPCOM', pattern: /魔界村|ghosts?\s*'?n'?\s*goblins/i },
  { term: 'ロックマン', owner: 'CAPCOM', pattern: /ロックマン|mega\s*man/i },
  // 「バイオハザード」は生物災害を指す一般語でもあるため、英題のみで検出する
  { term: 'バイオハザード', owner: 'CAPCOM', pattern: /resident\s*evil/i },
  { term: 'モンスターハンター', owner: 'CAPCOM', pattern: /モンスターハンター|monster\s*hunter/i },
  { term: 'CAPCOM', owner: 'CAPCOM', pattern: /\bcapcom\b|カプコン/i },
  { term: '餓狼伝説', owner: 'SNK', pattern: /餓狼伝説|fatal\s*fury/i },
  { term: 'キング・オブ・ファイターズ', owner: 'SNK', pattern: /キング\s*[・･]?\s*オブ\s*[・･]?\s*ファイターズ|king\s*of\s*fighters|\bkof\b/i },
  { term: 'サムライスピリッツ', owner: 'SNK', pattern: /サムライスピリッツ|samurai\s*shodown/i },
  { term: 'メタルスラッグ', owner: 'SNK', pattern: /メタルスラッグ|metal\s*slug/i },
  { term: '龍虎の拳', owner: 'SNK', pattern: /龍虎の拳|art\s*of\s*fighting/i },
  { term: 'NEOGEO', owner: 'SNK', pattern: /ネオジオ|\bneo\s*geo\b|\bneogeo\b/i },
  { term: 'SNK', owner: 'SNK', pattern: /\bsnk\b/i },
];

function excerptAround(line: string): string {
  const trimmed = line.trim();
  return trimmed.length > 120 ? trimmed.slice(0, 117) + '...' : trimmed;
}

/**
 * コードとファイル名を走査して権利上の危険語を検出する。
 * 走査対象はファイル全文（ヘッダーコメントの世界観・タイトル、描画される文字列リテラル、
 * 変数名まで含む）。生成指示が「〇〇風で」とコメントに残っている場合も拾う。
 */
export function checkIpSafety(code: string, opts?: { filename?: string }): IpSafetyResult {
  const violations: IpViolation[] = [];
  const licensedHits: IpSafetyResult['licensedHits'] = [];

  // ファイル名も1行目として扱う（slug に franchise 名が入るのを防ぐ）
  const lines = code.split('\n');
  const targets: Array<{ text: string; line: number }> = lines.map((text, i) => ({ text, line: i + 1 }));
  if (opts?.filename) targets.push({ text: opts.filename, line: 0 });

  for (const entry of IP_DENY_LIST) {
    for (const { text, line } of targets) {
      if (!entry.pattern.test(text)) continue;
      if (entry.except?.some((ex) => ex.test(text))) continue;
      violations.push({
        term: entry.term,
        owner: entry.owner,
        severity: entry.severity,
        line,
        excerpt: excerptAround(text),
        note: entry.note,
      });
      break; // 同一語は1ファイル1件に丸める（レポートを読める量に保つ）
    }
  }

  // 共起ルールはファイル全体（複数行にまたがる意匠の組み合わせ）で判定する
  const whole = opts?.filename ? `${opts.filename}\n${code}` : code;
  for (const rule of IP_COMPOSITE_RULES) {
    if (!rule.all.every((re) => re.test(whole))) continue;
    // 何行目の話かは特定できないので、最初に当たった行を代表として示す
    const hitLine = targets.find(({ text }) => rule.all.some((re) => re.test(text)));
    violations.push({
      term: rule.term,
      owner: rule.owner,
      severity: 'error',
      line: hitLine?.line ?? 0,
      excerpt: hitLine ? excerptAround(hitLine.text) : '',
      note: rule.note,
    });
  }

  for (const entry of LICENSED_TERMS) {
    for (const { text, line } of targets) {
      if (!entry.pattern.test(text)) continue;
      licensedHits.push({ term: entry.term, owner: entry.owner, line });
      break;
    }
  }

  return {
    ok: violations.every((v) => v.severity !== 'error'),
    violations,
    licensedHits,
  };
}

// ---------------------------------------------------------------
// ネタ（アイデア）段階のふるい
// ---------------------------------------------------------------

export interface NetaLike {
  id: number;
  title: string;
  idea?: string;
}

export interface NetaIpFilterResult<T extends NetaLike> {
  safe: T[];
  rejected: Array<{ id: number; title: string; terms: string[] }>;
}

/**
 * ネタ帳から権利上危険なエントリを外す。
 *
 * 「パックマン」「テトリス」といったタイトルのネタをそのまま生成に流すと、寄せたゲームが
 * 生まれる。落とすのはコード生成後ではなく**ネタ段階**が正しい（生成コストを払う前に止まる）。
 * 落としたネタは処理済みにせず残す運用にすること — 固有名詞を外して書き換えれば次回拾われる。
 */
export function filterIpSafeNetas<T extends NetaLike>(items: T[]): NetaIpFilterResult<T> {
  const safe: T[] = [];
  const rejected: NetaIpFilterResult<T>['rejected'] = [];

  for (const item of items) {
    const result = checkIpSafety(`${item.title}\n${item.idea ?? ''}`);
    const errors = result.violations.filter((v) => v.severity === 'error');
    if (errors.length === 0) {
      safe.push(item);
    } else {
      rejected.push({ id: item.id, title: item.title, terms: errors.map((e) => e.term) });
    }
  }

  return { safe, rejected };
}
