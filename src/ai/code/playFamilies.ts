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
  /** ジャンルが無い行(アーケード・ディスク機・貼り込み)を題名/play から推定する語。英数語は単語境界で、日本語は部分一致で当てる */
  keywords: string[];
  verdict: Verdict;
  verdictWhy: string;
  /** bar(外国人・2人客) / shokudo(1人・短い) / kanko(文字なし・音) */
  venues: Array<'bar' | 'shokudo' | 'kanko'>;
}

export const FAMILIES: FamilyRule[] = [
  {
    id: '撃つ',
    genres: ["Shoot'em Up", 'Shooter', 'Lightgun Shooter'],
    keywords: ['shoot', 'shooter', 'gun', 'blaster', 'invaders', 'galaga', 'xevious', 'raiden', 'strikers', 'gradius', 'force', 'wing', 'sniper', 'sensha', 'senkan', 'tank', 'zero wing', '1942', '1943', '19xx', 'toaplan', 'cave', '撃', '砲', '弾', '銃', '照準', 'スナイパー', 'シューティング', '侵略', '防衛軍', '戦車', '戦艦', '零戦', '機銃', 'ロックオン', '狙撃', 'missile', 'cannon', 'bomber', 'patrol', 'thunder', 'storm', 'squadron', 'gunner', 'zaxxon', 'galaxian', 'defender', 'phoenix', 'centipede', 'asteroids', 'batrider', 'garegga', 'dodonpachi'],
    verdict: '明',
    verdictWhy: '撃墜数・点が残る。外した弾も見える',
    venues: ['bar', 'kanko'],
  },
  {
    id: '殴る・斬る',
    genres: ['Fighting', "Beat'em Up"],
    keywords: ['fight', 'fighter', 'fighters', 'kakutou', 'vs\.?', 'versus', 'samurai', 'kung.?fu', 'karate', 'boxing', 'wrestl', 'sumou?', 'kenka', 'banchou', 'slug', 'brawl', 'kombat', 'street', 'chambara', 'ninja', '殴', '斬', '蹴', 'パンチ', '格闘', 'ボクシング', '相撲', 'プロレス', '剣道', '喧嘩', 'カウンター', 'ガード', '技を', '刀', '警官.*追', 'warriors', 'dynasty', 'tekken', 'virtua fighter', 'soul', 'blade', 'slash', 'knuckle', 'punch', 'kick', 'wrestle', 'smash bros', 'champion', 'ranger', 'commando', 'contra', 'rambo', 'double dragon', 'final fight'],
    verdict: '明',
    verdictWhy: '勝敗が出る。何を食らったかも見える',
    venues: ['bar'],
  },
  {
    id: '競う速さ',
    genres: ['Racing'],
    keywords: ['racing', 'race', 'rally', 'grand prix', 'gp', 'drift', 'kart', 'f-?1', 'formula', 'zeroyon', 'zero-?yon', 'tousou', 'speed', 'outrun', 'road', 'rider', 'bike', 'moto', 'レース', 'ハンドル', 'コーナー', 'ゼロヨン', 'ドリフト', 'バイク', 'カート', 'クラッチ', 'ギア', 'ニトロ', '周回', '抜く', '逃走', 'ハイウェイ', '走破', 'racer', 'driver', 'drive', 'wheel', 'superbike', 'manx', 'daytona', 'ridge', 'gran turismo', 'need for speed', 'burnout', 'nascar', 'indy', 'motocross', 'turbo', 'mario kart', 'wipeout'],
    verdict: '明',
    verdictWhy: 'タイム・順位が残る。どこで遅れたかも分かる',
    venues: ['bar', 'kanko'],
  },
  {
    id: '球技・スポーツ',
    genres: ['Sports', 'Sports with Animals'],
    keywords: ['soccer', 'football', 'baseball', 'yakyuu', 'tennis', 'golf', 'bowling', 'basket', 'volley', 'hockey', 'takkyuu', 'ping.?pong', 'dodge', 'rugby', 'ski', 'snowboard', 'skate', 'swim', 'suiei', 'track', 'olympic', 'sports?', 'putter', 'darts?', 'billiard', 'squash', 'futsal', 'kendo', 'judo', 'sumo', 'ボウリング', 'テニス', 'ゴルフ', 'サッカー', '野球', 'バレー', 'バスケ', '卓球', 'ドッジ', 'ラグビー', 'スキー', 'スノーボード', '水泳', 'ダーツ', 'ビリヤード', 'ホッケー', 'スカッシュ', 'フットサル', 'パター', 'ピン', 'スパイク', 'シュート', 'ラリー', '打席', '投球', 'pga', 'tour', 'nba', 'nfl', 'nhl', 'mlb', 'fifa', 'wwe', 'ufc', 'madden', 'pro evolution', 'winning eleven', 'jikkyou', 'powerful', 'bowl', 'cricket', '10 pin', 'pins', 'surf', 'athlete', 'decathlon', 'hyper sports', 'track & field', 'marathon'],
    verdict: '明',
    verdictWhy: '得点・勝敗が出る。入った/外したが一目',
    venues: ['bar', 'shokudo'],
  },
  {
    id: '盤・札',
    genres: ['Board', 'Card', 'Strategy'],
    keywords: ['mahjong', 'majan', 'shougi', 'shogi', 'igo', 'chess', 'reversi', 'othello', 'gomoku', 'hanafuda', 'card', 'trump', 'poker', 'blackjack', 'solitaire', 'sugoroku', 'board', 'table game', 'daifugou', 'uno', 'renju', 'backgammon', 'strategy', 'daisenryaku', 'wars?', '麻雀', '将棋', '囲碁', 'オセロ', '五目', '花札', 'ポーカー', 'ブラックジャック', 'トランプ', 'ババ抜き', '7並べ', '神経衰弱', 'ソリティア', '軍人将棋', 'すごろく', '牌', '札を', '駒', '石を', '盤', '手番', '王手', '詰め', '役を', 'jang', 'jong', 'majong', 'shanghai', 'koi-koi', 'checkers', 'klondike', 'hearts', 'spades', 'bridge', 'taisen', 'wars', 'tactics', 'commander', 'general', 'civilization', 'empire', 'kingdom', 'conquest'],
    verdict: '半',
    verdictWhy: '勝敗は明だが、1手で満足したかは局面次第',
    venues: ['bar', 'shokudo'],
  },
  {
    id: '賭け・運',
    genres: ['Gambling', 'Pinball'],
    keywords: ['pachinko', 'pachi-?slot', 'slot', 'casino', 'roulette', 'keiba', 'kyoutei', 'keirin', 'gambl', 'bet', 'lottery', 'kuji', 'uranai', 'fortune', 'tarot', 'horoscope', 'seimei', 'omikuji', 'pinball', 'dice', 'chinchiro', 'coin', 'ルーレット', 'サイコロ', '丁半', 'くじ', '占い', 'タロット', '画数', 'おみくじ', 'パチンコ', 'リール', 'スロット', '競馬', '競艇', '賭け', '博打', '当たり', '当てる', '引き', '運', 'カジノ', 'コイン', 'kaiji', 'tobaku', 'pachi', 'derby', 'jockey', 'horse', 'bingo', 'pin ball', 'flipper', 'gamble'],
    verdict: '明',
    verdictWhy: '当たり外れが一瞬で出る。腕に関係なく満足/不満足が決まる',
    venues: ['bar', 'shokudo', 'kanko'],
  },
  {
    id: '解く',
    genres: ['Puzzle', 'Thinking', 'Casual Game'],
    keywords: ['puzzle', 'tetris', 'puyo', 'columns', 'bobble', 'block kuzushi', 'breakout', 'arkanoid', 'sokoban', 'minesweeper', 'sudoku', 'nanpuro', 'crossword', 'jigsaw', 'slide', 'match', 'drop', 'magical drop', 'sort', 'merge', 'パズル', 'ブロック崩し', '落ちてくる', '揃え', 'ジグソー', 'クロスワード', '迷路', '数字', '並べ', '消す', '詰める', '塗', '線で', '繋', '回して', '順番', 'kuzushi', 'pop', 'block', 'blast', 'crush', 'jewel', 'gem', 'bejeweled', 'zuma', 'marble', 'bust-a-move', 'lumines', 'meteos', 'picross', 'logic', 'tangram', 'cube', 'rubik', 'nonogram', 'maze', 'labyrinth', 'escape', 'dasshutsu', 'misshitsu'],
    verdict: '半',
    verdictWhy: '解けた/解けないは明。時間内の出来の良し悪しは見せ方次第',
    venues: ['shokudo', 'kanko'],
  },
  {
    id: '答える',
    genres: ['Quiz', 'Educational'],
    keywords: ['quiz', 'kanji', 'eigo', 'english', 'drill', 'training', 'kentei', 'unou', 'nou', 'brain', 'iq', 'calc', 'keisan', 'kuizu', 'クイズ', '問', '正解', '漢字', '計算', '4択', '3択', '早押し', 'なぞなぞ', '単語', 'つづり', '標識', 'answer', 'trivia', 'typing', 'eitango', 'sudoku', 'nanpure', 'kakuro', 'crossword', 'vocab', 'math', 'sansuu', 'jeopardy', 'millionaire', 'family feud', 'wheel of fortune', 'shiken', 'nyuumon', 'benkyou', 'manabu', 'oboeru', 'study'],
    verdict: '明',
    verdictWhy: '正誤が即出る。何問取れたかで満足が決まる',
    venues: ['shokudo'],
  },
  {
    id: '走る・跳ぶ',
    genres: ['Platform', 'Action'],
    keywords: ['jump', 'runner', 'climb', 'adventure island', 'platform', 'mario', 'sonic', 'kirby', 'land', 'world', 'bros\.?', 'boy', 'kid', 'action', '跳', '走', '登', 'ジャンプ', '足場', '穴を', '跳び越え', '逃げ', '追われ', 'kun', 'chan', 'island', 'castle', 'cave', 'dungeon', 'tower', 'quest', 'hero', 'legend', 'densetsu', 'wonder', 'mega man', 'rockman', 'castlevania', 'metroid', 'prince', 'knight', 'dragon', 'ghosts', 'ghouls', 'goblins', 'donkey', 'kong', 'crash', 'spyro', 'rayman', 'lego', 'nickelodeon', 'disney', 'looney', 'simpsons', 'barbie', 'bratz', 'pet', 'hamster', 'dog', 'cat'],
    verdict: '半',
    verdictWhy: 'どこまで行けたかは残る。満足はコースの見せ方に依る',
    venues: ['kanko'],
  },
  {
    id: '音に乗る',
    genres: ['Music / Dancing', 'Music'],
    keywords: ['rhythm', 'dance', 'dancing', 'music', 'beatmania', 'taiko', 'pop\'?n', 'karaoke', 'ongaku', 'band', 'drum', 'piano', 'guitar', 'dj', 'beat', 'tempo', '拍', 'リズム', 'イントロ', '曲', '音に', '音で', '音を', 'メトロノーム', '太鼓', 'ダンス', 'pop\'n', 'ddr', 'para para', 'bemani', 'idol', 'utau', 'sing', 'vocal'],
    verdict: '明',
    verdictWhy: '拍ごとに良し悪しが出る。画面を見なくても分かる',
    venues: ['bar', 'kanko'],
  },
  {
    id: '狩る・釣る',
    genres: ['Hunting and Fishing'],
    keywords: ['fishing', 'tsuri', 'bass', 'hunt', 'hunting', 'mushi', 'konchuu', 'insect', 'catch', '釣', '竿', '魚', '虫', '網', '捕まえ', '狩', '獲物', 'fisherman', 'bait', 'marlin', 'angler', 'deer', 'duck', 'safari', 'butterfly'],
    verdict: '明',
    verdictWhy: '釣れた/逃したが一目。大きさで満足が決まる',
    venues: ['shokudo', 'kanko'],
  },
  {
    id: '探す・選ぶ',
    genres: ['Adventure', 'Role-playing (RPG)'],
    keywords: ['adventure', 'mystery', 'tantei', 'suiri', 'detective', 'escape', 'dasshutsu', 'misshitsu', 'quest', 'rpg', 'densetsu', 'monogatari', 'fantasy', 'dragon', 'saga', 'legend', 'novel', 'ren\'?ai', 'simulation', '恋', '会話', '相手の表情', '告白', '推理', '事件', '犯人', '証拠', '物語', 'デート', '一言', '言葉を選ぶ', '返事', '表情', '嘘', 'ren\'ai', 'renai', 'love', 'koi', 'kanojo', 'kareshi', 'otome', 'bishoujo', 'galge', 'dating', 'romance', 'visual', 'jikenbo', 'adv', 'story', 'chronicle', 'tale', 'final fantasy', 'dragon quest', 'persona', 'megami', 'tensei', 'xeno', 'ys', 'zelda', 'pokemon', 'pokémon', 'digimon', 'yu-gi-oh', 'summoner', 'ocean', 'knight chronicles', 'witcher', 'elder', 'fallout', 'mass effect', 'skyrim', 'oblivion', 'assassin', 'gta', 'grand theft', 'max payne', 'metal gear', 'splinter', 'hitman', 'resident evil', 'biohazard', 'silent hill', 'dead', 'survival', 'horror', 'zombie'],
    verdict: '不明',
    verdictWhy: '1プレイでは何も定まらない。「選んだ」だけで正誤も満足も出ない',
    venues: [],
  },
  {
    id: '育てる・回す',
    genres: ['Simulation'],
    keywords: ['tycoon', 'sim', 'keiei', 'ikusei', 'farm', 'bokujou', 'city', 'machi', 'shop', 'cafe', 'restaurant', 'hotel', 'taxi', 'densha', 'train', 'bus', 'truck', 'flight', 'pilot', '育て', '経営', '客', '注文', '運ぶ', '街', 'タクシー', '電車', 'バス', '運転', '世話', '店', 'カフェ', '料理', '材料', '注ぐ', '作る', 'sims', 'simulation', 'harvest', 'bus', 'airport', 'zoo', 'aquarium', 'pet shop', 'shelter', 'fashion', 'salon', 'cooking', 'chef', 'doctor', 'hospital', 'nurse', 'vet', 'babysit', 'nanny', 'animal crossing', 'tomodachi', 'nintendogs', 'imagine', 'manager', 'soccer manager', 'football manager'],
    verdict: '不明',
    verdictWhy: '積み上げ型。1プレイの終わりに正誤が出ない',
    venues: [],
  },
  {
    id: 'その他',
    genres: ['Compilation', 'Various', 'Adult', 'Demo', 'N/A'],
    keywords: [],
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

const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const COMPILED = new Map<string, RegExp>();
for (const f of FAMILIES) {
  if (f.keywords.length === 0) continue;
  const parts = f.keywords.map((t) => (/^[\x00-\x7f]+$/.test(t) ? `\\b${esc(t)}\\b` : esc(t)));
  COMPILED.set(f.id, new RegExp(parts.join('|'), 'i'));
}

/** 題名/play から系統を推定。'その他' はキーワードを持たないので当たらない */
export function familyByTitle(title: string): FamilyRule | null {
  for (const f of FAMILIES) {
    const re = COMPILED.get(f.id);
    if (re && re.test(title)) return f;
  }
  return null;
}

export const FAMILY_IDS = FAMILIES.map((f) => f.id);
