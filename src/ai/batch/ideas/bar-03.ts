/**
 * ideas/bar-03.ts
 * バー向けミニゲームネタ帳 021〜030
 */

export const bar03Ideas = [
  {
    id: 'bar-021',
    title: '誰が払う？',
    duration: 8,
    concept: '最大8人の名前を入力してルーレットを回す。名前が書かれた玉が回転し、1つが選ばれて大きく表示。「今夜○○さんがおごります！」というテキストとともに表示。',
    objects: [
      { shape: 'rect', role: '名前入力欄×最大8', note: '' },
      { shape: 'circle', role: '名前の入った玉（ルーレットで回る）', note: '' },
    ],
    counters: [],
    winTrigger: 'ルーレットが止まった',
    resultTrigger: '選ばれた名前と煽りテキストを表示',
  },
  {
    id: 'bar-022',
    title: '大喜利お題',
    duration: 10,
    concept: '「○○なのに△△な写真を撮ってください」「もし○○が△△だったら？」などのお題が30種以上ストックされている。タップするたびにランダムに表示。制限時間なしで何度でも引ける。',
    objects: [
      { shape: 'rect', role: 'お題テキスト（大きく表示）', note: '' },
      { shape: 'button', role: '次のお題ボタン', note: '' },
    ],
    counters: [],
    winTrigger: 'お題が表示された',
    resultTrigger: 'お題を全画面表示',
  },
  {
    id: 'bar-023',
    title: '罰ゲーム決め',
    duration: 8,
    concept: '「1杯おごる」「一発芸」「隣の人に告白の練習」など15種類の罰ゲームがルーレットで回る。止まった罰ゲームを全画面で発表。毎回ランダムに選ばれる仕組み。',
    objects: [
      { shape: 'circle', role: '罰ゲームルーレット（回転する）', note: '' },
    ],
    counters: [],
    winTrigger: 'ルーレットが止まった',
    resultTrigger: '罰ゲーム内容を全画面で大きく表示',
  },
  {
    id: 'bar-024',
    title: '乾杯テーマ',
    duration: 6,
    concept: '「○○に乾杯！」の○○の部分をランダムで決める。「今日もお疲れ様に」「全力で忘れたい月曜日に」「ここにいない誰かに」など笑えるテキストが30種以上。',
    objects: [
      { shape: 'rect', role: '乾杯テキスト（全画面）', note: '' },
      { shape: 'button', role: '次のテーマボタン', note: '' },
    ],
    counters: [],
    winTrigger: 'テーマが表示された',
    resultTrigger: '乾杯テキストを全画面表示',
  },
  {
    id: 'bar-025',
    title: 'カクテルお告げ',
    duration: 8,
    concept: '「今夜飲むべきお酒は…」という演出の後、スロット風にカクテル名が流れて止まる。選ばれたカクテルの一言説明（「甘口で飲みやすい◯◯をどうぞ」）とともに表示。',
    objects: [
      { shape: 'rect', role: 'カクテル名スロット（流れて止まる）', note: '' },
    ],
    counters: [],
    winTrigger: 'スロットが止まった',
    resultTrigger: 'カクテル名と一言説明を表示',
  },
  {
    id: 'bar-026',
    title: '数字当て（1〜10）',
    duration: 15,
    concept: '相手が1〜10の数字を心の中で決めて「OK」をタップ。自分が1〜10のボタンで当てる。正解すると「なんで分かるの！？」という煽り演出。外れると「残念！○○でした」。',
    objects: [
      { shape: 'button', role: '数字ボタン×10（1〜10）', note: '' },
      { shape: 'button', role: 'OKボタン（相手が押す）', note: '' },
    ],
    counters: [],
    winTrigger: '正解の数字をタップ',
    resultTrigger: '正解・不正解と正解数字を表示',
  },
  {
    id: 'bar-027',
    title: '線香花火',
    duration: 20,
    concept: '画面の下から線香花火の火花が広がっていく。花火が最大に咲いた瞬間（火花が一番広がった頂点）を画面タップでキャプチャ。早すぎると「もっと待って」、遅いと「散りました」。',
    objects: [
      { shape: 'star', role: '火花（じわじわ広がる）', note: '頂点で最大の光' },
      { shape: 'rect', role: '線香の棒', note: '' },
    ],
    counters: [],
    winTrigger: '花火が最大に咲いた瞬間をタップ',
    resultTrigger: '捉えた大きさの評価を表示',
  },
  {
    id: 'bar-028',
    title: '今日のラッキーナンバー',
    duration: 6,
    concept: '0〜9の数字が画面いっぱいにランダムに飛び回っている。タップした瞬間に全部止まって、1桁のラッキーナンバーが中央に大きく表示。「今日の○番に注目！」とコメント。',
    objects: [
      { shape: 'rect', role: '数字×10（飛び回る）', note: '' },
    ],
    counters: [],
    winTrigger: 'タップして止まった',
    resultTrigger: 'ラッキーナンバーと一言を表示',
  },
  {
    id: 'bar-029',
    title: '目をつぶって10秒',
    duration: 20,
    concept: 'スタートをタップして目をつぶる。10秒経ったと思ったらタップ。実際に何秒経っているかを表示。誤差が0.5秒以内で「達人」、2秒以内で「なかなか」、それ以上は「無感覚！」。',
    objects: [
      { shape: 'button', role: 'スタートボタン', note: '' },
      { shape: 'rect', role: '目を閉じた顔のアニメーション', note: '' },
    ],
    counters: [],
    winTrigger: '10秒と思ってタップ',
    resultTrigger: '実際の秒数と誤差評価を表示',
  },
  {
    id: 'bar-030',
    title: 'ウソ発見器（演出）',
    duration: 12,
    concept: '画面に手のひらを当てて（カメラや画面認識の演出）、「本当のことを言ってください」とメッセージが流れる。数秒後に「ウソです」「本当です」がランダムで判定。盛り上げ用エンタメ。',
    objects: [
      { shape: 'rect', role: '手のひら認識エリア（演出）', note: '' },
      { shape: 'rect', role: 'スキャン波形アニメーション', note: '' },
    ],
    counters: [],
    winTrigger: '手のひらを当ててスキャン完了',
    resultTrigger: '「ウソ」か「本当」をランダムで大きく表示',
  },
] as const;
