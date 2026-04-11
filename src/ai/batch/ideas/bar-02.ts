/**
 * ideas/bar-02.ts
 * バー向けミニゲームネタ帳 011〜020
 */

export const bar02Ideas = [
  {
    id: 'bar-011',
    title: '反射神経テスト',
    duration: 10,
    concept: '真っ暗な画面がカウントダウンなしに突然光る。光った瞬間にタップするまでの時間（ミリ秒）を測定。「0.18秒」などと表示し「人類平均」と比較するコメントが出る。',
    objects: [
      { shape: 'rect', role: '画面全体（暗→光る）', note: 'ランダムタイミングで光る' },
    ],
    counters: [],
    winTrigger: '光った直後にタップ',
    resultTrigger: '反応時間（ms）と評価コメントを表示',
  },
  {
    id: 'bar-012',
    title: 'ジャスト10秒',
    duration: 15,
    concept: '「スタート」タップ後、目をつぶって10秒を数える。もう一度タップして実際の経過時間を表示。ぴったり10秒に近いほど「天才的時間感覚！」と褒められる。',
    objects: [
      { shape: 'button', role: 'スタート/ストップボタン', note: '' },
      { shape: 'rect', role: '経過時間表示（ストップ後に見せる）', note: '' },
    ],
    counters: [],
    winTrigger: 'ストップボタンをタップ',
    resultTrigger: '実際の経過時間と誤差を表示',
  },
  {
    id: 'bar-013',
    title: '連打チャレンジ',
    duration: 8,
    concept: '5秒間、画面を何回タップできるか。タップするたびにカウントが増える。終了後「毎秒○回」と表示し、記録を保存できる。友人との対決に使える。',
    objects: [
      { shape: 'circle', role: '連打エリア（タップするたびに光る）', note: '' },
      { shape: 'rect', role: 'カウンター表示', note: '' },
      { shape: 'rect', role: 'タイマー（5秒）', note: '' },
    ],
    counters: [
      { id: 'taps', name: 'タップ数', target: 0, note: '記録として保存' },
    ],
    winTrigger: '5秒経過',
    resultTrigger: '総タップ数・毎秒平均を表示',
  },
  {
    id: 'bar-014',
    title: 'くじ引き',
    duration: 6,
    concept: '棒が束になって画面から突き出ている。1本をタップして引くと棒が抜けてくるアニメーション。先端が赤ければ「当たり」、白ければ「外れ」。当たりは1本だけ。',
    objects: [
      { shape: 'rect', role: 'くじ棒×複数（束になっている）', note: '' },
      { shape: 'star', role: '当たり棒（先端が赤い）', note: 'タップ前は非表示' },
    ],
    counters: [],
    winTrigger: '棒を1本タップして引いた',
    resultTrigger: '当たり・外れを大きく表示',
  },
  {
    id: 'bar-015',
    title: '風船ギリギリ',
    duration: 15,
    concept: '風船が少しずつ膨らんでいく。ギリギリのところでタップして止める——膨らみすぎると割れて終了。止めた大きさに応じてポイントが変わり「肝が据わってる！」などのコメントが出る。',
    objects: [
      { shape: 'balloon', role: '風船（膨らみ続ける）', note: 'ある閾値を超えると割れる' },
      { shape: 'button', role: '止めるボタン', note: '' },
    ],
    counters: [],
    winTrigger: '割れる前にボタンをタップ',
    resultTrigger: '止めた大きさとコメントを表示（割れたら失敗表示）',
  },
  {
    id: 'bar-016',
    title: 'スロットマシン',
    duration: 8,
    concept: '3列のリールが高速で回転する。タップするたびに1列ずつ止まる。3回タップして全列が止まった時の絵柄の組み合わせで役（777・バー・チェリー等）を判定。',
    objects: [
      { shape: 'rect', role: 'リール×3（回転する）', note: '各種絵柄' },
      { shape: 'button', role: 'ストップボタン（1列ずつ止まる）', note: '' },
    ],
    counters: [],
    winTrigger: '3列すべて止めた',
    resultTrigger: '役名と演出を表示',
  },
  {
    id: 'bar-017',
    title: '早口言葉タイマー',
    duration: 20,
    concept: '「東京特許許可局」など難しい早口言葉のお題が表示される。スタートをタップして言い終わったらストップ。タイムと「成功・失敗（自己申告）」を記録して表示する。',
    objects: [
      { shape: 'rect', role: '早口言葉テキスト（大きく表示）', note: '' },
      { shape: 'button', role: 'スタート/ストップボタン', note: '' },
      { shape: 'rect', role: 'タイムカウンター', note: '' },
    ],
    counters: [],
    winTrigger: 'ストップをタップして「成功」を押した',
    resultTrigger: 'タイムと成否を表示',
  },
  {
    id: 'bar-018',
    title: 'ハイ＆ロー',
    duration: 10,
    concept: 'トランプが1枚表になる。次のカードが「HIGH（高い）」か「LOW（低い）」かを2択でタップ。正解すると次のカードへ。3連続正解でクリア。外れた時点で終了。',
    objects: [
      { shape: 'rect', role: 'トランプカード（表示中）', note: '' },
      { shape: 'button', role: 'HIGHボタン', note: '' },
      { shape: 'button', role: 'LOWボタン', note: '' },
    ],
    counters: [
      { id: 'correct', name: '連続正解数', target: 3, note: '3回でクリア' },
    ],
    winTrigger: '3連続正解',
    resultTrigger: '正解数と最終カードを表示',
  },
  {
    id: 'bar-019',
    title: 'プチプチ',
    duration: 15,
    concept: '画面全体がプチプチのシートで覆われている。タップするたびに1個がへこんで「プチッ」と鳴る。15秒でいくつ潰せるかカウント。全部潰すと「コンプリート！」',
    objects: [
      { shape: 'circle', role: 'プチプチの気泡（タップで潰れる）', note: '' },
    ],
    counters: [
      { id: 'pops', name: '潰した数', target: 0, note: '記録として表示' },
    ],
    winTrigger: '15秒経過または全部潰す',
    resultTrigger: '潰した数と残りを表示',
  },
  {
    id: 'bar-020',
    title: '割り勘計算機',
    duration: 20,
    concept: '合計金額と人数を素早く入力できるシンプルなUI。1人あたりの金額を大きく表示。端数の処理方法（切り上げ・切り捨て・四捨五入）を選べる。「1人あたり○○円（○○円は誰かが多く払う）」と明確に表示。',
    objects: [
      { shape: 'rect', role: '金額入力エリア', note: '' },
      { shape: 'rect', role: '人数入力エリア', note: '' },
      { shape: 'button', role: '端数処理ボタン×3', note: '' },
    ],
    counters: [],
    winTrigger: '人数と金額を入力して計算',
    resultTrigger: '1人あたり金額と端数処理方法を表示',
  },
] as const;
