/**
 * ideas/bar-01.ts
 * バー向けミニゲームネタ帳 001〜010
 */

export const bar01Ideas = [
  {
    id: 'bar-001',
    title: 'じゃんけん',
    duration: 5,
    concept: '画面に「グー・チョキ・パー」の3ボタンが並ぶ。タップすると同時にAIがランダムで手を出す。どちらが勝ったか大きく表示。勝ち・負け・あいこで演出が違う。',
    objects: [
      { shape: 'circle', role: 'グーボタン', note: '' },
      { shape: 'diamond', role: 'チョキボタン', note: '' },
      { shape: 'rect', role: 'パーボタン', note: '' },
    ],
    counters: [],
    winTrigger: '自分の手がAIに勝った',
    resultTrigger: '勝ち・負け・あいこを大きく表示',
  },
  {
    id: 'bar-002',
    title: 'チンチロリン',
    duration: 8,
    concept: 'サイコロ3個が丼の中を転がる演出。タップで振る。3個の出目の組み合わせ（ゾロ目・役なし・シゴロなど）を表示して役の名前と意味を出す。',
    objects: [
      { shape: 'circle', role: 'サイコロ×3（転がる）', note: '1〜6の目' },
      { shape: 'rect', role: '丼の中（コンテナ）', note: '' },
    ],
    counters: [],
    winTrigger: 'サイコロが止まった',
    resultTrigger: '役名と強さランクを表示',
  },
  {
    id: 'bar-003',
    title: 'おみくじ',
    duration: 8,
    concept: '細長い棒が入った筒を振るアニメ。傾けるとゆっくり1本だけ出てくる演出。出た番号の運勢（大吉〜凶）と今日のひとことメッセージを表示。',
    objects: [
      { shape: 'rect', role: 'おみくじ筒（揺れる）', note: '' },
      { shape: 'rect', role: 'おみくじ棒（1本出てくる）', note: '番号と運勢が書かれている' },
    ],
    counters: [],
    winTrigger: '棒が出てきた',
    resultTrigger: '運勢と今日のメッセージを表示',
  },
  {
    id: 'bar-004',
    title: 'コイントス',
    duration: 6,
    concept: 'コインが画面上で回転しながら上昇し、ピークに達した瞬間にタップすると表か裏かが決まる。タップが早いと「まだ空中です」、遅いと「落ちました」と表示されてやり直し。',
    objects: [
      { shape: 'coin', role: 'コイン（回転しながら上昇）', note: 'ピークで光る' },
    ],
    counters: [],
    winTrigger: 'ピーク時にタップすると表・裏の結果表示',
    resultTrigger: '表か裏かを大きく表示',
  },
  {
    id: 'bar-005',
    title: 'ルーレット',
    duration: 10,
    concept: '色付きのルーレット盤が画面いっぱいに広がる。タップで勢いよく回転し始め、だんだん減速して止まった色を発表。色には意味（赤＝情熱の夜、青＝冷静に帰れ、など）がついている。',
    objects: [
      { shape: 'circle', role: 'ルーレット盤（8色に分割）', note: '減速しながら止まる' },
      { shape: 'triangle', role: '針（上部固定）', note: '' },
    ],
    counters: [],
    winTrigger: 'ルーレットが止まった',
    resultTrigger: '止まった色のメッセージを表示',
  },
  {
    id: 'bar-006',
    title: 'スピン・ザ・ボトル',
    duration: 10,
    concept: 'テーブルの上に置かれたボトルのイメージ。タップで瓶がクルクル回転し、止まった先の方向（北・東・南・西など）を大きく表示。「この方向を向いている人！」と盛り上げるテキストが出る。',
    objects: [
      { shape: 'rect', role: 'ボトル（回転する）', note: '止まった方向を示す' },
      { shape: 'circle', role: '方向インジケーター（外周）', note: '' },
    ],
    counters: [],
    winTrigger: 'ボトルが止まった',
    resultTrigger: '止まった方向と煽りテキストを表示',
  },
  {
    id: 'bar-007',
    title: 'タロット1枚引き',
    duration: 8,
    concept: '裏向きのカードが扇形に広がっている。1枚をタップすると選ばれたカードがひっくり返り、絵柄とカード名・一言メッセージが表示される。正位置・逆位置もランダムで決まる。',
    objects: [
      { shape: 'rect', role: 'タロットカード×複数（扇形）', note: '' },
      { shape: 'rect', role: '選ばれたカード（めくれる）', note: '絵柄と意味を表示' },
    ],
    counters: [],
    winTrigger: 'カードをタップしてめくった',
    resultTrigger: 'カード名・正逆・一言を表示',
  },
  {
    id: 'bar-008',
    title: '相性診断（血液型）',
    duration: 12,
    concept: '2人の血液型をそれぞれ選ぶ（A・B・O・AB）。タップするとハートのアニメーションとともに相性パーセンテージとコメントが出る。同じ血液型でも毎回微妙に変わる。',
    objects: [
      { shape: 'button', role: '血液型ボタン×4（1人目）', note: '' },
      { shape: 'button', role: '血液型ボタン×4（2人目）', note: '' },
      { shape: 'face', role: 'ハートアニメーション', note: '' },
    ],
    counters: [],
    winTrigger: '2人分の血液型を選んでタップ',
    resultTrigger: '相性%とコメントを表示',
  },
  {
    id: 'bar-009',
    title: 'さいころ（大小）',
    duration: 5,
    concept: '画面をタップするとサイコロ1個が転がって止まる。出た目が大きく表示される。シンプルに「大（4〜6）」「小（1〜3）」の判定も出る。',
    objects: [
      { shape: 'rect', role: 'サイコロ（転がる）', note: '1〜6の目' },
    ],
    counters: [],
    winTrigger: 'サイコロが止まった',
    resultTrigger: '出た目・大小を表示',
  },
  {
    id: 'bar-010',
    title: 'あみだくじ',
    duration: 12,
    concept: '5本の縦線とランダムな横線があみだ状に引かれている。上の番号を1つタップすると、縦横を辿るアニメーションが動き、下の結果（当たり・ハズレ、または役割名）に到達する。',
    objects: [
      { shape: 'rect', role: 'あみだ縦線×5', note: '' },
      { shape: 'rect', role: 'あみだ横線（ランダム配置）', note: '' },
      { shape: 'star', role: '辿るアニメーション', note: '' },
    ],
    counters: [],
    winTrigger: '上の番号を選んでタップ',
    resultTrigger: '到達した結果を表示',
  },
] as const;
