/**
 * ideas/bar-13.ts
 * バー向けミニゲームネタ帳 121〜130
 */

export const bar13Ideas = [
  {
    id: 'bar-121',
    title: '四字熟語おみくじ',
    duration: 8,
    concept: '棒を引く演出の後に四字熟語が1つ表示される（「天下無双」「七転八起」「一石二鳥」など20種以上）。四字熟語の意味と「今夜のあなたへのメッセージ」が添えられる。',
    objects: [
      { shape: 'rect', role: 'おみくじ棒（引く）', note: '' },
      { shape: 'rect', role: '四字熟語（大きく全画面）', note: '' },
    ],
    counters: [],
    winTrigger: '棒を引いた',
    resultTrigger: '四字熟語と意味・メッセージを表示',
  },
  {
    id: 'bar-122',
    title: '易占い（コイン3枚）',
    duration: 12,
    concept: 'コインを3枚同時に振る演出（表=2点・裏=3点）。3枚の合計値を6回繰り返して64卦の中から1つを導く。卦の名前（例：「乾」「坤」）と短い占い文が表示される。',
    objects: [
      { shape: 'coin', role: 'コイン×3（振られる）', note: '表か裏かがランダムで決まる' },
      { shape: 'button', role: '振るボタン', note: '' },
    ],
    counters: [
      { id: 'throws', name: '投回数', target: 6, note: '6回で卦が決まる' },
    ],
    winTrigger: '6回振り終えた',
    resultTrigger: '卦の名前と占い文を表示',
  },
  {
    id: 'bar-123',
    title: '除夜の鐘（108回）',
    duration: 30,
    concept: '煩悩の数108回、鐘を撞く。タップするたびに「ゴーン」と鐘の音が鳴り、カウントが進む。108回目に「煩悩を祓い落としました！今年もありがとう」という演出。お正月シーズン限定感を演出。',
    objects: [
      { shape: 'circle', role: '鐘（タップで揺れる）', note: '' },
      { shape: 'rect', role: 'カウンター（あと○回）', note: '' },
    ],
    counters: [
      { id: 'strikes', name: '鐘を撞いた数', target: 108, note: '108回でクリア' },
    ],
    winTrigger: '108回タップした',
    resultTrigger: '「煩悩祓い完了！」メッセージを表示',
  },
  {
    id: 'bar-124',
    title: '「ご縁のある人」占い',
    duration: 10,
    concept: '「今夜、この場所にいる人の中に運命の人がいます」という設定で、参加者の名前を入力してタップ。「○○さんです！」とランダムで1人が選ばれ、「あなたたちが出会ったのは偶然ではありません」のメッセージ。',
    objects: [
      { shape: 'rect', role: '名前入力欄×複数', note: '' },
      { shape: 'star', role: '運命の糸アニメーション', note: '' },
    ],
    counters: [],
    winTrigger: '名前を入力してタップ',
    resultTrigger: 'ランダムで1人の名前を大きく表示',
  },
  {
    id: 'bar-125',
    title: 'IQ1問テスト',
    duration: 15,
    concept: '「医者のお父さんに子供がいます。でも医者には子供がいません。なぜ？」などの思考を問うなぞなぞ系IQ問題が表示される。答えを見るボタンで種明かし。「あなたのIQは○」という演出的診断も。',
    objects: [
      { shape: 'rect', role: 'IQ問題テキスト（全画面）', note: '' },
      { shape: 'button', role: '答えを見るボタン', note: '' },
    ],
    counters: [],
    winTrigger: '答えを見るボタンをタップ',
    resultTrigger: '答えと解説・IQ演出コメントを表示',
  },
  {
    id: 'bar-126',
    title: '利きジュース',
    duration: 15,
    concept: '「目をつぶって飲んでください。何のジュース？」という設定で3択を表示。目隠し試飲を実際にやってもらった後に当てた飲み物を選ぶ。当たると「鋭い舌を持っています！」外れると「意外と鈍感？」',
    objects: [
      { shape: 'button', role: 'ジュース名の3択ボタン', note: '' },
    ],
    counters: [],
    winTrigger: '選択肢をタップ',
    resultTrigger: '正解・不正解の演出コメントを表示',
  },
  {
    id: 'bar-127',
    title: 'パズル（スライドパズル3×3）',
    duration: 30,
    concept: '3×3のスライドパズル。1マスだけ空きがあり、隣のピースをスライドして元の絵に戻す。完成させるか3分以内に何手で解けるか記録。完成すると「○手で完成！」と表示。',
    objects: [
      { shape: 'rect', role: 'スライドパズルのピース×8', note: 'スワイプで移動' },
    ],
    counters: [
      { id: 'moves', name: '手数', target: 0, note: '手数を記録' },
    ],
    winTrigger: 'パズルが完成した',
    resultTrigger: '完成手数とタイムを表示',
  },
  {
    id: 'bar-128',
    title: '奇跡の一致',
    duration: 15,
    concept: '2人がそれぞれのスマホで（または1人が代わりに）1〜100の数字を選んでタップ。両方が同じ数字を選んでいると「奇跡！あなたたちは運命で繋がっています！」という演出。確率1/100の盛り上がり。',
    objects: [
      { shape: 'button', role: '数字選択（スライダーか入力）', note: '' },
    ],
    counters: [],
    winTrigger: '両者が選択した',
    resultTrigger: '一致したら奇跡演出、違えば「惜しい！差は○でした」を表示',
  },
  {
    id: 'bar-129',
    title: '七並べ（1手）',
    duration: 10,
    concept: '7枚のカードが配られて7のカードから始まる七並べを1ラウンドだけ体験。自分の手番で出せるカードが光る。1手を選んでタップするだけで場の状況が変わる演出。',
    objects: [
      { shape: 'rect', role: '手持ちのカード×7', note: '出せるカードが光る' },
      { shape: 'rect', role: '場（7のカードを中心に広がる）', note: '' },
    ],
    counters: [],
    winTrigger: '1枚カードを選んで出した',
    resultTrigger: '出したカードと場の変化を表示',
  },
  {
    id: 'bar-130',
    title: 'ガラポン抽選',
    duration: 10,
    concept: 'ガラポン（ガラガラ）のハンドルをスワイプで回す演出。カラフルな玉が転がり出てくる。玉の色（金・銀・赤・白・青）によって当たりランクが決まる。金玉が出ると盛大な演出。',
    objects: [
      { shape: 'circle', role: 'ガラポン本体（球が入っている）', note: '' },
      { shape: 'circle', role: '出てきた玉（色がランダム）', note: '金・銀・赤・白・青' },
    ],
    counters: [],
    winTrigger: 'ハンドルを回した',
    resultTrigger: '玉の色と当たりランクを表示',
  },
] as const;
