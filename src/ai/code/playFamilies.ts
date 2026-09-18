/**
 * playFamilies.ts — 制作リストの「系統」「判定の明確さ」「拠点適性」の規則
 *
 * 系統(family)は libretro の genre 実データ(14機種・名寄せ後 12,336本・31ジャンル)の
 * 分布を見てから起こした。5〜30秒で成立する「核」でジャンルを束ねている。
 * 分布(2026-09): Platform 1959 / Action 1827 / Sports 1782 / RPG 1079 / Racing 675 /
 * Strategy 659 / Puzzle 631 / Adventure 605 / Shoot'em Up 418 / Board 414 / Shooter 407 /
 * Fighting 304 / Simulation 275 / Beat'em Up 259 / Compilation 245 / Gambling 178 /
 * Educational 95 / Hunting and Fishing 79 / Card 70 / Sports with Animals 69 / Pinball 62 /
 * Quiz 61 / Various 52 / Casual Game 40 / Music/Dancing 38 / Lightgun 30 / ほか
 *
 * 判定の明確さ(verdict)は「1コイン1プレイ」の基準:
 *   1プレイの終わりに、自分のプレイについて 正解/不正解 と 満足/不満足 が
 *   一目で分かるか。明 = 両方 / 半 = 片方 / 不明 = 「N回できた」しか残らない。
 * ここにあるのは系統ごとの既定値。行ごとの上書きは sources/plays/*.tsv の status 列と
 * 同じ要領で sources/verdicts.tsv に書く(id<TAB>verdict<TAB>why)。
 */

export type Verdict = '明' | '半' | '不明';

export interface FamilyRule {
  id: string;
  /** どのジャンルを束ねるか(libretro の genre 文字列) */
  genres: string[];
  /** ジャンルが無い行(アーケード・ディスク機・貼り込み)を題名から推定する語 */
  keywords: RegExp;
  verdict: Verdict;
  verdictWhy: string;
  /** bar(外国人・2人客) / shokudo(1人・短い) / kanko(文字なし・音) */
  venues: Array<'bar' | 'shokudo' | 'kanko'>;
}

export const FAMILIES: FamilyRule[] = [
  {
    id: '撃つ',
    genres: ["Shoot'em Up", 'Shooter', 'Lightgun Shooter'],
    keywords: /\b(shoot|shooter|gun\b|blaster|invaders|galaga|xevious|raiden|strikers|gradius|force\b|wing|sniper|sensha|senkan|tank\b|zero wing|1942|1943|19xx|toaplan|cave)\b/i,
    verdict: '明',
    verdictWhy: '撃墜数・点が残る。外した弾も見える',
    venues: ['bar', 'kanko'],
  },
  {
    id: '殴る・斬る',
    genres: ['Fighting', "Beat'em Up"],
    keywords: /\b(fight|fighter|fighters|kakutou|vs\.?|versus|samurai|kung.?fu|karate|boxing|wrestl|sumou?|kenka|banchou|slug|brawl|kombat|street|chambara|ninja)\b/i,
    verdict: '明',
    verdictWhy: '勝敗が出る。何を食らったかも見える',
    venues: ['bar'],
  },
  {
    id: '競う速さ',
    genres: ['Racing'],
    keywords: /\b(racing|race|rally|grand prix|\bgp\b|drift|kart|f-?1|formula|zeroyon|zero-?yon|tousou|speed|outrun|road|rider|bike|moto)\b/i,
    verdict: '明',
    verdictWhy: 'タイム・順位が残る。どこで遅れたかも分かる',
    venues: ['bar', 'kanko'],
  },
  {
    id: '球技・スポーツ',
    genres: ['Sports', 'Sports with Animals'],
    keywords: /\b(soccer|football|baseball|yakyuu|tennis|golf|bowling|basket|volley|hockey|takkyuu|ping.?pong|dodge|rugby|ski|snowboard|skate|swim|suiei|track|olympic|sports?|putter|darts?|billiard|squash|futsal|kendo|judo|sumo)\b/i,
    verdict: '明',
    verdictWhy: '得点・勝敗が出る。入った/外したが一目',
    venues: ['bar', 'shokudo'],
  },
  {
    id: '盤・札',
    genres: ['Board', 'Card', 'Strategy'],
    keywords: /\b(mahjong|majan|shougi|shogi|igo\b|go\b|chess|reversi|othello|gomoku|hanafuda|card|trump|poker|blackjack|solitaire|sugoroku|board|table game|daifugou|uno\b|renju|backgammon|strategy|daisenryaku|wars?)\b/i,
    verdict: '半',
    verdictWhy: '勝敗は明だが、1手で満足したかは局面次第',
    venues: ['bar', 'shokudo'],
  },
  {
    id: '賭け・運',
    genres: ['Gambling', 'Pinball'],
    keywords: /\b(pachinko|pachi-?slot|slot|casino|roulette|keiba|kyoutei|keirin|gambl|bet|lottery|kuji|uranai|fortune|tarot|horoscope|seimei|omikuji|pinball|dice|chinchiro|coin)\b/i,
    verdict: '明',
    verdictWhy: '当たり外れが一瞬で出る。腕に関係なく満足/不満足が決まる',
    venues: ['bar', 'shokudo', 'kanko'],
  },
  {
    id: '解く',
    genres: ['Puzzle', 'Thinking', 'Casual Game'],
    keywords: /\b(puzzle|tetris|puyo|columns|bobble|block kuzushi|breakout|arkanoid|sokoban|minesweeper|sudoku|nanpuro|crossword|jigsaw|slide|match|drop|magical drop|pop|sort|merge)\b/i,
    verdict: '半',
    verdictWhy: '解けた/解けないは明。時間内の出来の良し悪しは見せ方次第',
    venues: ['shokudo', 'kanko'],
  },
  {
    id: '答える',
    genres: ['Quiz', 'Educational'],
    keywords: /\b(quiz|kanji|eigo|english|drill|training|kentei|unou|nou\b|brain|iq\b|calc|keisan|test|kuizu)\b/i,
    verdict: '明',
    verdictWhy: '正誤が即出る。何問取れたかで満足が決まる',
    venues: ['shokudo'],
  },
  {
    id: '走る・跳ぶ',
    genres: ['Platform', 'Action'],
    keywords: /\b(jump|run\b|runner|climb|adventure island|platform|mario|sonic|kirby|land\b|world\b|bros\.?|boy\b|kid\b|action)\b/i,
    verdict: '半',
    verdictWhy: 'どこまで行けたかは残る。満足はコースの見せ方に依る',
    venues: ['kanko'],
  },
  {
    id: '音に乗る',
    genres: ['Music / Dancing', 'Music'],
    keywords: /\b(rhythm|dance|dancing|music|beatmania|taiko|pop'?n|karaoke|ongaku|band|drum|piano|guitar|dj\b|beat|tempo)\b/i,
    verdict: '明',
    verdictWhy: '拍ごとに良し悪しが出る。画面を見なくても分かる',
    venues: ['bar', 'kanko'],
  },
  {
    id: '狩る・釣る',
    genres: ['Hunting and Fishing'],
    keywords: /\b(fishing|tsuri|bass|hunt|hunting|mushi|konchuu|insect|catch)\b/i,
    verdict: '明',
    verdictWhy: '釣れた/逃したが一目。大きさで満足が決まる',
    venues: ['shokudo', 'kanko'],
  },
  {
    id: '探す・選ぶ',
    genres: ['Adventure', 'Role-playing (RPG)'],
    keywords: /\b(adventure|mystery|tantei|suiri|detective|escape|dasshutsu|misshitsu|quest|rpg|densetsu|monogatari|fantasy|dragon|saga|legend|novel|ren'?ai|simulation)\b/i,
    verdict: '不明',
    verdictWhy: '1プレイでは何も定まらない。「選んだ」だけで正誤も満足も出ない',
    venues: [],
  },
  {
    id: '育てる・回す',
    genres: ['Simulation'],
    keywords: /\b(tycoon|sim\b|keiei|ikusei|farm|bokujou|city|machi|shop|cafe|restaurant|hotel|taxi|densha|train|bus|truck|flight|pilot)\b/i,
    verdict: '不明',
    verdictWhy: '積み上げ型。1プレイの終わりに正誤が出ない',
    venues: [],
  },
  {
    id: 'その他',
    genres: ['Compilation', 'Various', 'Adult', 'Demo', 'N/A'],
    keywords: /$^/,
    verdict: '不明',
    verdictWhy: '複数収録・雑多で1つの遊びに絞れない',
    venues: [],
  },
];

const BY_GENRE = new Map<string, FamilyRule>();
for (const f of FAMILIES) for (const g of f.genres) BY_GENRE.set(g.toLowerCase(), f);

/** genre 文字列(libretro)から系統。無ければ null */
export function familyByGenre(genre: string | undefined): FamilyRule | null {
  if (!genre) return null;
  return BY_GENRE.get(genre.toLowerCase()) ?? null;
}

/** 題名から系統を推定。'その他' はキーワードを持たないので当たらない */
export function familyByTitle(title: string): FamilyRule | null {
  for (const f of FAMILIES) if (f.id !== 'その他' && f.keywords.test(title)) return f;
  return null;
}

export const FAMILY_IDS = FAMILIES.map((f) => f.id);
